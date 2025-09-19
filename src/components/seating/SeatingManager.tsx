import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { X, Settings, Grid3X3, Eye, FileText, Star, ChevronDown, ChevronUp, Building } from 'lucide-react'
import SeatingConfigurationWizard from './SeatingConfigurationWizard'
import { useSeatingConfigurations, useSeatAssignments } from '../../hooks/useSeatingData'
import { useAttendees, useAgendaItems, useDiningOptions } from '../../hooks/useSupabaseData'
import SeatingToolbar from './SeatingToolbar'
import AttendeePanel from './AttendeePanel'
import ClassroomLayoutPanel from './ClassroomLayoutPanel'
import TableLayoutPanel from './TableLayoutPanel'
import ClassroomGridLayout from './ClassroomGridLayout'
import TableListView from './TableListView'
import TableGridLayout from './TableGridLayout'
import { getPriorityNetworkingInfo, getCompaniesWithSeatingRequests } from '../../utils/seatingUtils'
import { hasAttendeeSelectedAgendaItem, hasAttendeeSelectedDiningOption } from '../../utils/agendaUtils'

interface SeatingManagerProps {
  eventId: string
  eventType: 'agenda' | 'dining'
  eventName: string
  eventCapacity?: number
  mode: 'configure' | 'manage'
  onClose: () => void
}

export default function SeatingManager({ eventId, eventType, eventName, eventCapacity, mode, onClose }: SeatingManagerProps) {
  // State variables
  const [showConfigWizard, setShowConfigWizard] = useState(false)
  const [classroomViewMode, setClassroomViewMode] = useState<'visual' | 'grid'>('visual')
  const [tableViewMode, setTableViewMode] = useState<'list' | 'visual'>('list')
  const [currentConfig, setCurrentConfig] = useState<any>(null)
  const [savedAssignments, setSavedAssignments] = useState(new Map())
  const [pendingAssignments, setPendingAssignments] = useState(new Map())
  const [isModified, setIsModified] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasConfigurationChanges, setHasConfigurationChanges] = useState(false)
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<any>(null)
  const [priorityNetworkingInfo, setPriorityNetworkingInfo] = useState(new Map())
  const [companiesWithSeatingRequests, setCompaniesWithSeatingRequests] = useState<any[]>([])
  const [showSeatingNotes, setShowSeatingNotes] = useState(false)

  // Hooks
  const { attendees } = useAttendees()
  const { agendaItems } = useAgendaItems()
  const { diningOptions } = useDiningOptions()
  const { configurations, createConfiguration, updateConfiguration } = useSeatingConfigurations()
  const { assignments, bulkUpdateAssignments } = useSeatAssignments(currentConfig?.id)

  // Combine saved and pending assignments for display
  const tempAssignments = React.useMemo(() => {
    const combined = new Map(savedAssignments)
    
    for (const [key, assignment] of pendingAssignments.entries()) {
      if (assignment.toRemove) {
        combined.delete(key)
      } else {
        combined.set(key, assignment)
      }
    }
    
    return combined
  }, [savedAssignments, pendingAssignments])

  // Find existing configuration for this event
  useEffect(() => {
    const existingConfig = configurations.find(config => 
      eventType === 'agenda' ? config.agenda_item_id === eventId : config.dining_option_id === eventId
    )
    
    setCurrentConfig(existingConfig || null)
    
    // Store original configuration for comparison
    if (existingConfig) {
      setOriginalConfig(JSON.parse(JSON.stringify(existingConfig)))
    }
    
    // Show configuration wizard based on mode and existing config
    if (mode === 'configure' || !existingConfig || existingConfig.configuration_status === 'waiting') {
      setShowConfigWizard(true)
    } else if (mode === 'manage') {
      setShowConfigWizard(false)
    }
  }, [configurations, eventId, eventType, mode])

  // Track configuration changes
  useEffect(() => {
    if (!currentConfig || !originalConfig) {
      setHasConfigurationChanges(false)
      return
    }
    
    // Compare current config with original to detect changes
    const configChanged = JSON.stringify(currentConfig.layout_config) !== JSON.stringify(originalConfig.layout_config)
    setHasConfigurationChanges(configChanged)
  }, [currentConfig, originalConfig])

  // Load existing assignments into saved state
  useEffect(() => {
    if (assignments.length > 0) {
      const assignmentMap = new Map()
      assignments.forEach(assignment => {
        let key: string
        
        if (currentConfig?.layout_type === 'classroom') {
          key = `${assignment.row_number}-${assignment.column_number}`
        } else {
          key = `${assignment.table_name}-${assignment.seat_number}`
        }
        
        assignmentMap.set(key, {
          attendeeId: assignment.attendee_id,
          attendeeFirstName: assignment.attendee_first_name,
          attendeeLastName: assignment.attendee_last_name,
          tableName: assignment.table_name,
          seatNumber: assignment.seat_number,
          rowNumber: assignment.row_number,
          columnNumber: assignment.column_number,
          assignmentType: assignment.assignment_type,
          is_blocked: assignment.is_blocked || false,
          saved: true
        })
      })
      
      setSavedAssignments(assignmentMap)
      setPendingAssignments(new Map()) // Clear pending when loading saved
      setIsModified(false) // Reset modified state when loading saved data
    }
  }, [assignments, currentConfig])

  // Load priority networking info and company seating requests
  useEffect(() => {
    const loadSeatingData = async () => {
      if (attendees.length > 0) {
        // Load priority networking info for all attendees
        const priorityInfo = await getPriorityNetworkingInfo(attendees)
        setPriorityNetworkingInfo(priorityInfo)

        // Load companies with seating requests
        const companiesWithRequests = await getCompaniesWithSeatingRequests()
        setCompaniesWithSeatingRequests(companiesWithRequests)
      }
    }
    loadSeatingData()
  }, [attendees])

  const handleSeatAssignment = (attendee: any, ...args: any[]) => {
    const newPendingAssignments = new Map(pendingAssignments)
    
    // Remove any existing assignments for this attendee
    for (const existingKey of Array.from(newPendingAssignments.keys())) {
      const assignment = newPendingAssignments.get(existingKey)
      if (assignment.attendeeId === attendee.id) {
        newPendingAssignments.delete(existingKey)
      }
    }
    for (const existingKey of Array.from(savedAssignments.keys())) {
      const assignment = savedAssignments.get(existingKey)
      if (assignment.attendeeId === attendee.id) {
        newPendingAssignments.set(existingKey, { ...assignment, toRemove: true })
      }
    }
    
    let key: string
    let assignmentData: any
    
    if (currentConfig?.layout_type === 'classroom') {
      const [row, column] = args
      key = `${row}-${column}`
      
      assignmentData = {
        attendeeId: attendee.id || attendee,
        attendeeFirstName: attendee.firstName || attendee.first_name,
        attendeeLastName: attendee.lastName || attendee.last_name,
        rowNumber: row,
        columnNumber: column,
        assignmentType: 'manual',
        saved: false
      }
    } else {
      const [tableName, seatNumber] = args
      key = `${tableName}-${seatNumber}`
      
      assignmentData = {
        attendeeId: attendee.id || attendee,
        attendeeFirstName: attendee.firstName || attendee.first_name,
        attendeeLastName: attendee.lastName || attendee.last_name,
        tableName,
        seatNumber,
        assignmentType: 'manual',
        saved: false
      }
    }
    
    // Add the new assignment
    newPendingAssignments.set(key, assignmentData)
    setPendingAssignments(newPendingAssignments)
    setIsModified(true)
  }


  const handleRemoveAssignment = (...args: any[]) => {
    let key: string
    
    if (currentConfig?.layout_type === 'classroom') {
      const [row, column] = args
      key = `${row}-${column}`
    } else {
      const [tableName, seatNumber] = args
      key = `${tableName}-${seatNumber}`
    }
    
    const newPendingAssignments = new Map(pendingAssignments)
    
    // Remove from pending assignments
    newPendingAssignments.delete(key)
    
    // If this was a saved assignment, mark it for removal
    if (savedAssignments.has(key)) {
      newPendingAssignments.set(key, { toRemove: true })
    }
    
    setPendingAssignments(newPendingAssignments)
    setIsModified(true)
  }

  const handleSave = async () => {
    if (!currentConfig) {
      return
    }
    
    setIsSaving(true)
    try {
      // Combine saved and pending assignments
      const allAssignments = new Map(savedAssignments)
      
      // Apply pending changes
      for (const [key, assignment] of pendingAssignments.entries()) {
        if (assignment.toRemove) {
          allAssignments.delete(key)
        } else {
          allAssignments.set(key, assignment)
        }
      }
      
      // Convert all assignments to database format
      const assignmentData = Array.from(allAssignments.values()).map(assignment => {        
        const baseData = {
          seating_configuration_id: currentConfig.id,
          attendee_id: assignment.attendeeId,
          seat_position: { x: 0, y: 0 },
          assignment_type: assignment.assignmentType || 'manual',
          assigned_at: new Date().toISOString(),
          notes: ''
        }

        // Add layout-specific fields based on configuration type
        if (currentConfig.layout_type === 'classroom') {
          return {
            ...baseData,
            table_name: null,
            seat_number: null,
            row_number: assignment.rowNumber,
            column_number: assignment.columnNumber
          }
        } else {
          return {
            ...baseData,
            table_name: assignment.tableName,
            seat_number: assignment.seatNumber,
            row_number: null,
            column_number: null
          }
        }
      })

      await bulkUpdateAssignments(assignmentData)
      
      // Clear pending assignments - saved assignments will be reloaded from database
      setPendingAssignments(new Map())
      setIsModified(false)
      
    } catch (error) {
      console.error('SeatingManager: Error saving seating assignments:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to save seating assignments: ${errorMessage}. Please try again.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all pending assignments?')) {
      setPendingAssignments(new Map())
      setIsModified(savedAssignments.size > 0)
    }
  }


  const handleConfigurationSave = async (configData: any) => {
    try {
      let savedConfig
      
      if (currentConfig && mode === 'configure') {
        // Update existing configuration
        await updateConfiguration(currentConfig.id, {
          layout_type: configData.layout_type,
          layout_config: configData.layout_config,
          configuration_status: 'configured',
          auto_assignment_rules: configData.auto_assignment_rules || {}
        })
        savedConfig = { ...currentConfig, ...configData }
      } else {
        // Create new configuration
        savedConfig = await createConfiguration({
          [eventType === 'agenda' ? 'agenda_item_id' : 'dining_option_id']: eventId,
          layout_type: configData.layout_type,
          layout_config: configData.layout_config,
          configuration_status: 'configured',
          has_seating: true,
          seating_type: 'assigned',
          auto_assignment_rules: configData.auto_assignment_rules || {},
          is_active: true
        })
      }
      
      setCurrentConfig(savedConfig)
      setShowConfigWizard(false)
      
      // Clear any existing assignments when configuration changes
      if (mode === 'configure') {
        setSavedAssignments(new Map())
        setPendingAssignments(new Map())
        setIsModified(false)
      }
    } catch (error) {
      console.error('SeatingManager: Error saving configuration:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save configuration: ${errorMessage}. Please try again.`)
    }
  }

  const getEligibleAttendees = () => {
    return attendees.filter(attendee => {
      // Must be confirmed
      const isConfirmed = attendee.registration_status === 'confirmed' || attendee.registrationStatus === 'confirmed'
      if (!isConfirmed) return false
      
      // For agenda events, check if attendee selected this specific breakout session
      if (eventType === 'agenda') {
        const agendaItem = agendaItems.find(item => item.id === eventId)
        if (!agendaItem) {
          console.warn(`Agenda item not found for eventId: ${eventId}`)
          return false
        }
        
        return hasAttendeeSelectedAgendaItem(attendee, eventId, agendaItem.title)
      }
      
      // For dining events, check if attendee confirmed attendance for this specific dining option
      if (eventType === 'dining') {
        const diningOption = diningOptions.find(option => option.id === eventId)
        if (!diningOption) {
          console.warn(`Dining option not found for eventId: ${eventId}`)
          return false
        }
        
        return hasAttendeeSelectedDiningOption(attendee, eventId, diningOption.name)
      }
      
      // Default: exclude if we can't determine eligibility
      return false
    })
  }

  const getUnseatedAttendees = () => {
    const assignedAttendeeIds = new Set(
      Array.from(tempAssignments.values()).map(assignment => assignment.attendeeId)
    )
    
    const eligibleAttendees = getEligibleAttendees()
    const unseated = eligibleAttendees.filter(attendee => !assignedAttendeeIds.has(attendee.id))
    
    // Sort to group spouses with their primary attendees
    return unseated.sort((a, b) => {
      // If one is a spouse and the other is their primary attendee, keep them together
      if (a.isSpouse && a.primaryAttendeeId === b.id) return 1
      if (b.isSpouse && b.primaryAttendeeId === a.id) return -1
      
      // Otherwise sort by name
      const aName = `${a.firstName || a.first_name} ${a.lastName || a.last_name}`
      const bName = `${b.firstName || b.first_name} ${b.lastName || b.last_name}`
      return aName.localeCompare(bName)
    })
  }

  const getSeatedAttendees = () => {
    const assignedAttendeeIds = Array.from(tempAssignments.values())
      .filter(assignment => assignment.attendeeId)
      .map(assignment => assignment.attendeeId)
    return getEligibleAttendees().filter(attendee => assignedAttendeeIds.includes(attendee.id))
  }

  if (showConfigWizard) {
    return (
      <SeatingConfigurationWizard
        eventId={eventId}
        eventType={eventType}
        eventName={eventName}
        eventCapacity={eventCapacity}
        existingConfig={currentConfig}
        mode={mode}
        onSave={handleConfigurationSave}
        onCancel={onClose}
      />
    )
  }

  if (!currentConfig) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
            <span className="ml-3 text-brand-navy">Loading seating configuration...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full h-full m-2 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-brand-navy">
                Seating Management: {eventName}
              </h2>
              <p className="text-brand-gray text-sm">
                {currentConfig.layout_type === 'classroom' ? 'Classroom Layout' : 'Table Layout'} • 
                {getSeatedAttendees().length} seated, {getUnseatedAttendees().length} remaining
                {eventCapacity && ` • Max Capacity: ${eventCapacity}`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Classroom View Toggle */}
              {currentConfig.layout_type === 'classroom' && currentConfig.layout_config.layoutType !== 'variable' && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setClassroomViewMode('visual')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      classroomViewMode === 'visual'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-brand-gray hover:text-brand-navy'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visual Layout</span>
                  </button>
                  <button
                    onClick={() => setClassroomViewMode('grid')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      classroomViewMode === 'grid'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-brand-gray hover:text-brand-navy'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>Grid Layout</span>
                  </button>
                </div>
              )}
              
              {/* View Mode Toggle for Table Seating */}
              {currentConfig?.layout_type === 'table' && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setTableViewMode('list')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      tableViewMode === 'list'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-brand-gray hover:text-brand-navy'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => setTableViewMode('visual')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      tableViewMode === 'visual'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-brand-gray hover:text-brand-navy'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visual Layout</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowConfigWizard(true)}
                className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
                title="Reconfigure layout"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <SeatingToolbar
            isModified={isModified}
            isSaving={isSaving}
            onSave={handleSave}
            onReset={handleReset}
            onExport={() => {/* TODO: Implement export */}}
          />

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            <AttendeePanel
              attendees={getUnseatedAttendees()}
             allEligibleAttendees={getEligibleAttendees()}
              priorityNetworkingInfo={priorityNetworkingInfo}
              companiesWithSeatingRequests={companiesWithSeatingRequests}
              onAttendeeSelect={(attendee) => console.log('SeatingManager: Selected attendee:', attendee)}
            />
            
            {currentConfig.layout_type === 'classroom' ? (
              (classroomViewMode === 'visual' && currentConfig.layout_config.layoutType !== 'variable') ? (
                <ClassroomLayoutPanel
                  classroomConfig={currentConfig.layout_config}
                  assignments={tempAssignments}
                  attendees={attendees}
                  priorityNetworkingInfo={priorityNetworkingInfo}
                  companiesWithSeatingRequests={companiesWithSeatingRequests}
                  onSeatAssignment={handleSeatAssignment}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              ) : (
                <ClassroomGridLayout
                  classroomConfig={currentConfig.layout_config}
                  assignments={tempAssignments}
                  attendees={attendees}
                  priorityNetworkingInfo={priorityNetworkingInfo}
                  companiesWithSeatingRequests={companiesWithSeatingRequests}
                  onSeatAssignment={handleSeatAssignment}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              )
            ) : (
              tableViewMode === 'list' ? (
                <TableListView
                  tables={currentConfig.layout_config.tables || []}
                  assignments={tempAssignments}
                  attendees={attendees}
                  priorityNetworkingInfo={priorityNetworkingInfo}
                  companiesWithSeatingRequests={companiesWithSeatingRequests}
                  onSeatAssignment={handleSeatAssignment}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              ) : (
                <TableLayoutPanel
                  tables={currentConfig.layout_config.tables || []}
                  assignments={tempAssignments}
                  attendees={attendees}
                  priorityNetworkingInfo={priorityNetworkingInfo}
                  companiesWithSeatingRequests={companiesWithSeatingRequests}
                  isManageMode={true}
                  onSeatAssignment={handleSeatAssignment}
                  onRemoveAssignment={handleRemoveAssignment}
                />
              )
            )}
          </div>
          
          {/* Seating Notes Toggle */}
          {/* Capacity and Stats Display */}
          <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-brand-navy mb-2">Event Statistics</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between space-x-4">
                <span>Total Attendees:</span>
                <span className="font-semibold text-brand-navy">{getEligibleAttendees().length}</span>
              </div>
              <div className="flex justify-between space-x-4">
                <span>Total Unseated:</span>
                <span className="font-semibold text-brand-navy">{getUnseatedAttendees().length}</span>
              </div>
              <div className="flex justify-between space-x-4">
                <span>Total Capacity:</span>
                <span className="font-semibold text-brand-navy">
                  {eventCapacity || 'Unlimited'}
                </span>
              </div>
              {companiesWithSeatingRequests.length > 0 && (
                <div className="flex justify-between space-x-4 pt-2 border-t border-gray-200">
                  <span>Companies with Requests:</span>
                  <span className="font-semibold text-blue-600">{companiesWithSeatingRequests.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  )
}