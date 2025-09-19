import React, { useState, useEffect } from 'react'
import { Save, X, Grid3X3, Table, Users, Settings, Plus, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase' // Import supabase
import { useImportableConfigurations, useSeatingPlanImport } from '../../hooks/useSeatingData'

interface SeatingConfigurationWizardProps {
  eventId: string
  eventType: 'agenda' | 'dining'
  eventName: string
  eventCapacity?: number
  existingConfig?: any
  mode: 'manage' | 'configure'
  onSave: (config: any) => void
  onCancel: () => void
}

export default function SeatingConfigurationWizard({ 
  eventId, 
  eventType, 
  eventName, 
  eventCapacity,
  existingConfig,
  mode,
  onSave, 
  onCancel 
}: SeatingConfigurationWizardProps) {
  const [layoutType, setLayoutType] = useState<'table' | 'classroom'>('table')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [currentEventCapacity, setCurrentEventCapacity] = useState<number | undefined>(eventCapacity) // New state for capacity
  const [capacityLoading, setCapacityLoading] = useState(false)
  const [classroomLayoutType, setClassroomLayoutType] = useState<'uniform' | 'variable'>('uniform')
  const [selectedImportConfigId, setSelectedImportConfigId] = useState('')
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [importResults, setImportResults] = useState<{ layout: any; assignmentCount: number } | null>(null)
  
  // Import hooks
  const { importableConfigs, loading: importLoading } = useImportableConfigurations(layoutType)
  const { importing, error: importError, importSeatingPlan } = useSeatingPlanImport()
  
  const [tableConfig, setTableConfig] = useState({
    tables: [
      { name: 'Table 1', capacity: 8, position: { x: 100, y: 100 } },
      { name: 'Table 2', capacity: 8, position: { x: 300, y: 100 } }
    ]
  })
  
  const [classroomConfig, setClassroomConfig] = useState({
    layoutType: 'uniform' as 'uniform' | 'variable',
    rows: 5,
    columns: 8,
    sectionDivider: undefined as number | undefined,
    seatSpacing: { horizontal: 60, vertical: 60 },
    aisles: [] as { type: 'horizontal' | 'vertical'; position: number }[],
    variableRows: [] as { id: string; columns: number; sectionDivider?: number }[]
  })

  // Load existing configuration data when editing
  useEffect(() => {
    if (existingConfig && mode === 'configure') {
      console.log('Loading existing configuration for editing:', existingConfig)
      
      setLayoutType(existingConfig.layout_type || 'table')
      
      if (existingConfig.layout_config) {
        if (existingConfig.layout_type === 'table') {
          setTableConfig(existingConfig.layout_config)
        } else if (existingConfig.layout_type === 'classroom') {
          setClassroomConfig({
            layoutType: existingConfig.layout_config.layoutType || 'uniform',
            rows: existingConfig.layout_config.rows || 5,
            columns: existingConfig.layout_config.columns || 8,
            sectionDivider: existingConfig.layout_config.sectionDivider,
            seatSpacing: existingConfig.layout_config.seatSpacing || { horizontal: 60, vertical: 60 },
            aisles: existingConfig.layout_config.aisles || [],
            variableRows: existingConfig.layout_config.variableRows || []
          })
          setClassroomLayoutType(existingConfig.layout_config.layoutType || 'uniform')
        }
      }
    }
  }, [existingConfig, mode])

  // Effect to fetch the most up-to-date event capacity based on entity type
  useEffect(() => {
    const fetchEventCapacity = async () => {
      setCapacityLoading(true)
      let fetchedCapacity: number | undefined = undefined;

      try {
        // Determine which table to query based on eventType
        if (eventType === 'agenda') {
          const { data, error } = await supabase
            .from('agenda_items')
            .select('capacity')
            .eq('id', eventId)
            .single();

          if (error) {
            console.error('Error fetching agenda item capacity:', error);
            setSaveError(`Failed to load agenda item capacity: ${error.message}`);
          } else if (data) {
            // For agenda items, use the general capacity field
            fetchedCapacity = data.capacity ?? undefined;
          }
        } else if (eventType === 'dining') {
          const { data, error } = await supabase
            .from('dining_options')
            .select('capacity')
            .eq('id', eventId)
            .single();

          if (error) {
            console.error('Error fetching dining option capacity:', error);
            setSaveError(`Failed to load dining option capacity: ${error.message}`);
          } else if (data) {
            // For dining options, use the general capacity field
            fetchedCapacity = data.capacity ?? undefined;
          }
        } else {
          console.warn('Unknown eventType for capacity fetching:', eventType);
          setSaveError('Unknown event type for capacity determination.');
        }
        setCurrentEventCapacity(fetchedCapacity);
      } catch (err) {
        console.error('Unexpected error fetching event capacity:', err);
        setSaveError(`An unexpected error occurred while fetching capacity: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setCapacityLoading(false);
      }
    };

    // Only fetch if eventId and eventType are available, and if we are in 'configure' mode
    // or if eventCapacity was not initially provided (meaning it might be missing/stale)
    if (eventId && eventType) {
      // If we are in 'configure' mode (editing an existing config) or if the initial eventCapacity is undefined,
      // we should always fetch the latest capacity from the source table.
      // Otherwise, if eventCapacity is already provided and we are not in 'configure' mode,
      // we can assume it's fresh from the initial event list load.
      if (mode === 'configure' || eventCapacity === undefined) {
        fetchEventCapacity();
      } else {
        setCurrentEventCapacity(eventCapacity); // Use the prop if it's fresh and not in configure mode
      }
    }
  }, [eventId, eventType, mode, eventCapacity]); // Re-run if these props change

  const getTotalCapacity = () => {
    if (layoutType === 'table') {
      return tableConfig.tables.reduce((total, table) => total + table.capacity, 0)
    } else {
      if (classroomConfig.layoutType === 'variable') {
        const totalSeats = classroomConfig.variableRows.reduce((sum, row) => sum + row.columns, 0)
        return totalSeats
      } else {
        const totalSeats = classroomConfig.rows * classroomConfig.columns
        return totalSeats
      }
    }
  }

  const isCapacityValid = () => {
    // Use currentEventCapacity for validation
    if (currentEventCapacity === undefined || currentEventCapacity === null) return true // No capacity limit set for the event
    return getTotalCapacity() <= currentEventCapacity
  }

  const validateConfiguration = () => {
    const errors = []
    
    if (layoutType === 'table') {
      if (tableConfig.tables.length === 0) {
        errors.push('At least one table is required')
      }
      
      tableConfig.tables.forEach((table, index) => {
        if (!table.name.trim()) {
          errors.push(`Table ${index + 1} must have a name`)
        }
        if (table.capacity < 1) {
          errors.push(`Table ${index + 1} must have at least 1 seat`)
        }
      })
    } else {
      if (classroomConfig.layoutType === 'variable') {
        if (classroomConfig.variableRows.length < 1) {
          errors.push('Variable seating must have at least 1 row')
        }
        
        classroomConfig.variableRows.forEach((row, index) => {
          if (row.columns < 1) {
            errors.push(`Row ${index + 1} must have at least 1 seat`)
          }
          if (row.sectionDivider && row.sectionDivider > row.columns) {
            errors.push(`Row ${index + 1}: Seats per section cannot be greater than total seats in row`)
          }
        })
      } else {
        if (classroomConfig.rows < 1 || classroomConfig.columns < 1) {
          errors.push('Classroom must have at least 1 row and 1 column')
        }
        
        if (classroomConfig.sectionDivider && classroomConfig.sectionDivider > classroomConfig.columns) {
          errors.push('Section divider cannot be larger than the number of columns')
        }
      }
    }
    
    // Use currentEventCapacity for validation message
    if (!isCapacityValid()) {
      errors.push(`Seating capacity (${getTotalCapacity()}) cannot exceed event capacity (${currentEventCapacity})`)
    }
    
    return errors
  }

  const handleSave = async () => {
    setSaveError('')
    
    // Validate configuration
    const validationErrors = validateConfiguration()
    if (validationErrors.length > 0) {
      setSaveError(validationErrors.join('. '))
      return
    }

    setIsSaving(true)
    
    try {
      const config = {
        layout_type: layoutType,
        layout_config: layoutType === 'table' ? tableConfig : classroomConfig,
        auto_assignment_rules: {},
      }

      console.log('Saving seating configuration:', config)
      await onSave(config)
      
    } catch (error) {
      console.error('Error saving configuration:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const addTable = () => {
    const newTable = {
      name: `Table ${tableConfig.tables.length + 1}`,
      shape: 'round' as 'round' | 'rectangle',
      capacity: 8,
      position: { 
        x: 100 + (tableConfig.tables.length % 3) * 200, 
        y: 100 + Math.floor(tableConfig.tables.length / 3) * 150 
      }
    }
    setTableConfig(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }))
  }

  const removeTable = (index: number) => {
    setTableConfig(prev => ({
      ...prev,
      tables: prev.tables.filter((_, i) => i !== index)
    }))
  }

  const updateTable = (index: number, field: string, value: any) => {
    setTableConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) => 
        i === index ? { ...table, [field]: value } : table
      )
    }))
  }

  // Calculate seat positions around a table based on shape
  const calculateSeatPosition = (table: any, seatIndex: number) => {
    const centerX = table.position.x
    const centerY = table.position.y
    const capacity = table.capacity
    
    if (table.shape === 'rectangle') {
      // Rectangle table - distribute seats around perimeter
      const tableWidth = 140
      const tableHeight = 70
      const perimeter = 2 * (tableWidth + tableHeight)
      const seatSpacing = perimeter / capacity
      const currentDistance = seatIndex * seatSpacing
      
      let x, y
      
      if (currentDistance <= tableWidth) {
        // Top edge
        x = centerX - tableWidth/2 + currentDistance
        y = centerY - tableHeight/2 - 25
      } else if (currentDistance <= tableWidth + tableHeight) {
        // Right edge
        x = centerX + tableWidth/2 + 25
        y = centerY - tableHeight/2 + (currentDistance - tableWidth)
      } else if (currentDistance <= 2 * tableWidth + tableHeight) {
        // Bottom edge
        x = centerX + tableWidth/2 - (currentDistance - tableWidth - tableHeight)
        y = centerY + tableHeight/2 + 25
      } else {
        // Left edge
        x = centerX - tableWidth/2 - 25
        y = centerY + tableHeight/2 - (currentDistance - 2 * tableWidth - tableHeight)
      }
      
      return { x, y }
    } else {
      // Round table - distribute seats in circle
      const radius = 70
      const angle = (seatIndex / capacity) * 2 * Math.PI - Math.PI / 2 // Start from top
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      return { x, y }
    }
  }

  const handleClassroomLayoutTypeChange = (newType: 'uniform' | 'variable') => {
    if (newType === classroomLayoutType) return
    
    if (newType === 'variable') {
      // Convert uniform to variable
      const variableRows = Array.from({ length: classroomConfig.rows }, (_, index) => ({
        id: `row-${index}`,
        columns: classroomConfig.columns,
        sectionDivider: classroomConfig.sectionDivider
      }))
      
      setClassroomConfig(prev => ({
        ...prev,
        layoutType: 'variable',
        variableRows
      }))
    } else {
      // Convert variable to uniform with warning
      if (classroomConfig.variableRows.length > 0) {
        const confirmed = confirm(
          'Switching to uniform seating will replace your variable row configurations with a single uniform setting. This action cannot be undone. Continue?'
        )
        
        if (!confirmed) return
        
        // Use first row's settings as defaults
        const firstRow = classroomConfig.variableRows[0]
        setClassroomConfig(prev => ({
          ...prev,
          layoutType: 'uniform',
          rows: prev.variableRows.length,
          columns: firstRow?.columns || 8,
          sectionDivider: firstRow?.sectionDivider,
          variableRows: []
        }))
      } else {
        setClassroomConfig(prev => ({
          ...prev,
          layoutType: 'uniform'
        }))
      }
    }
    
    setClassroomLayoutType(newType)
  }

  const addVariableRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      columns: 8,
      sectionDivider: undefined
    }
    setClassroomConfig(prev => ({
      ...prev,
      variableRows: [...prev.variableRows, newRow]
    }))
  }

  const removeVariableRow = (rowId: string) => {
    setClassroomConfig(prev => ({
      ...prev,
      variableRows: prev.variableRows.filter(row => row.id !== rowId)
    }))
  }

  const updateVariableRow = (rowId: string, field: string, value: any) => {
    setClassroomConfig(prev => ({
      ...prev,
      variableRows: prev.variableRows.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    }))
  }

  const showImportSection = mode === 'configure'

  const handleImportPlan = async () => {
    if (!selectedImportConfigId) {
      alert('Please select a seating plan to import')
      return
    }


    const confirmMessage = existingConfig?.id 
      ? 'This will replace the current layout and all seat assignments. This action cannot be undone. Continue?'
      : 'This will set up the initial layout and seat assignments from the selected plan. Continue?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      if (existingConfig?.id) {
        // Import into existing configuration
        const results = await importSeatingPlan(selectedImportConfigId, existingConfig.id)
        
        // Update local state with imported layout
        if (layoutType === 'table') {
          setTableConfig(results.layout)
        } else {
          setClassroomConfig(results.layout)
          setClassroomLayoutType(results.layout.layoutType || 'uniform')
        }
        
        setImportResults(results)
        setShowImportSuccess(true)
      } else {
        // For new configurations, just load the layout into local state
        const { data: sourceConfig, error } = await supabase
          .from('seating_configurations')
          .select('layout_config, layout_type')
          .eq('id', selectedImportConfigId)
          .single()

        if (error) {
          throw new Error(`Failed to load source configuration: ${error.message}`)
        }

        // Update local state with imported layout
        if (layoutType === 'table') {
          setTableConfig(sourceConfig.layout_config)
        } else {
          setClassroomConfig(sourceConfig.layout_config)
          setClassroomLayoutType(sourceConfig.layout_config.layoutType || 'uniform')
        }
        
        setImportResults({ layout: sourceConfig.layout_config, assignmentCount: 0 })
        setShowImportSuccess(true)
      }
      
      setSelectedImportConfigId('')
      
      // Auto-close success message after 3 seconds
      setTimeout(() => {
        setShowImportSuccess(false)
      }, 3000)
      
    } catch (error) {
      console.error('Error importing seating plan:', error)
      alert(`Failed to import seating plan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              {mode === 'configure' && existingConfig ? 'Edit' : 'Configure'} Seating: {eventName}
            </h2>
            <p className="text-brand-gray text-sm">
              {mode === 'configure' && existingConfig 
                ? 'Modify the existing seating configuration' 
                : 'Set up seating layout and capacity'
              } • {
                capacityLoading ? 'Loading capacity...' :
                (currentEventCapacity !== undefined && currentEventCapacity !== null) ? `Event max capacity: ${currentEventCapacity}` : 'No event capacity limit'
              }
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Import Success Message */}
          {showImportSuccess && importResults && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Seating Plan Imported Successfully!</span>
              </div>
              <p className="text-sm text-green-700">
                Layout updated and {importResults.assignmentCount} seat assignments copied.
              </p>
            </div>
          )}

          {/* Import Error Message */}
          {importError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-800">Import Failed: {importError}</span>
              </div>
            </div>
          )}

          {/* Layout Type Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Choose Seating Layout Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setLayoutType('table')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  layoutType === 'table'
                    ? 'border-brand-navy bg-brand-navy/5'
                    : 'border-gray-200 hover:border-brand-navy/50'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Table className="w-6 h-6 text-brand-navy" />
                  <span className="text-lg font-semibold text-brand-navy">Table Seating</span>
                </div>
                <p className="text-sm text-brand-gray">
                  Round or rectangular tables with configurable seat counts. Ideal for dining and networking events.
                </p>
              </button>

              <button
                onClick={() => setLayoutType('classroom')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  layoutType === 'classroom'
                    ? 'border-brand-navy bg-brand-navy/5'
                    : 'border-gray-200 hover:border-brand-navy/50'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Grid3X3 className="w-6 h-6 text-brand-navy" />
                  <span className="text-lg font-semibold text-brand-navy">Classroom Seating</span>
                </div>
                <p className="text-sm text-brand-gray">
                  Grid-based rows and columns layout. Perfect for presentations and workshops.
                </p>
              </button>
            </div>
          </div>

          {/* Import Existing Seating Plan - Show in configure mode */}
          {mode === 'configure' && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Download className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    Import Existing Seating Plan
                  </h3>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  Copy the layout and seat assignments from another {layoutType} seating configuration.
                  {existingConfig ? 'This will replace your current configuration.' : 'This will set up the initial configuration.'}
                </p>
                
                {importLoading ? (
                  <div className="flex items-center space-x-2 text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading available seating plans...</span>
                  </div>
                ) : importableConfigs.length > 0 ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <select
                        value={selectedImportConfigId}
                        onChange={(e) => setSelectedImportConfigId(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      >
                        <option value="">Select a seating plan to import...</option>
                        {importableConfigs.map((config) => (
                          <option key={config.id} value={config.id}>
                            {config.eventName} ({layoutType} layout) - {
                              config.layout_type === 'table' 
                                ? `${config.layout_config?.tables?.length || 0} tables`
                                : config.layout_config?.layoutType === 'variable'
                                  ? `${config.layout_config?.variableRows?.length || 0} variable rows`
                                  : `${config.layout_config?.rows || 0}×${config.layout_config?.columns || 0} grid`
                            }
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleImportPlan}
                      disabled={!selectedImportConfigId || importing}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Plan
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-blue-700">
                    <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No existing {layoutType} seating plans available for import</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table Configuration */}
          {layoutType === 'table' && (
            <div className="space-y-6">
              {/* Table Configuration Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-brand-navy">
                    Table Configuration
                  </h3>
                  <button
                    onClick={addTable}
                    className="inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-sm"
                  >
                    <Table className="w-4 h-4 mr-1" />
                    Add Table
                  </button>
                </div>
                
                <div className="space-y-4">
                  {tableConfig.tables.map((table, index) => (
                    <React.Fragment key={index}>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div>
                              <label className="block text-sm font-semibold text-brand-navy mb-2">
                                Table Name
                              </label>
                              <input
                                type="text"
                                value={table.name}
                                onChange={(e) => updateTable(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-brand-navy mb-2">
                                Capacity
                              </label>
                              <input
                                type="number"
                                value={table.capacity}
                                onChange={(e) => updateTable(index, 'capacity', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                                min="1"
                                max="20"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-brand-navy mb-2">
                                Shape
                              </label>
                              <select
                                value={table.shape || 'round'}
                                onChange={(e) => updateTable(index, 'shape', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                              >
                                <option value="round">Round</option>
                                <option value="rectangle">Rectangle</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-brand-navy mb-2">
                                Position X
                              </label>
                              <input
                                type="number"
                                value={table.position.x}
                                onChange={(e) => updateTable(index, 'position', { ...table.position, x: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                                min="0"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <label className="block text-sm font-semibold text-brand-navy mb-2">
                                  Position Y
                                </label>
                                <input
                                  type="number"
                                  value={table.position.y}
                                  onChange={(e) => updateTable(index, 'position', { ...table.position, y: parseInt(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                                  min="0"
                                />
                              </div>

                              {tableConfig.tables.length > 1 && (
                                <button
                                  onClick={() => removeTable(index)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              {/* Visual Table Map Preview - Moved to Bottom */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-md font-semibold text-brand-navy mb-3">
                    Table Layout Preview
                </h4>
                  <div className="bg-gray-50 p-6 rounded-lg overflow-auto border-2 border-gray-200" style={{ height: '500px' }}>
                    <div className="relative w-full h-full min-w-[800px] min-h-[450px]">
                    {/* Room boundaries */}
                      <div className="absolute inset-4 border-2 border-dashed border-gray-400 rounded-lg bg-white/50">
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-600 bg-white px-3 py-1 rounded">
                        Event Room Layout
                      </div>
                    </div>
                    
                    {/* Tables */}
                    {tableConfig.tables.map((table, index) => (
                      <div key={index}>
                        {/* Table Shape */}
                        <div
                            className={`absolute border-2 border-brand-navy bg-gray-200 flex items-center justify-center font-semibold text-brand-navy text-sm ${
                            table.shape === 'rectangle' ? 'rounded-lg' : 'rounded-full'
                          }`}
                          style={{
                              left: table.position.x - 50,
                              top: table.position.y - 35,
                              width: table.shape === 'rectangle' ? 140 : 100,
                              height: table.shape === 'rectangle' ? 70 : 100
                          }}
                        >
                          <span>{table.name}</span>
                        </div>
                        
                        {/* Seats around table */}
                        {Array.from({ length: table.capacity }, (_, seatIndex) => {
                          const seatPosition = calculateSeatPosition(table, seatIndex)
                          return (
                            <div
                              key={seatIndex}
                              className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-semibold"
                              style={{
                                left: seatPosition.x - 12,
                                top: seatPosition.y - 12
                              }}
                            >
                              {seatIndex + 1}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                  <p className="text-sm text-brand-gray mt-3">
                    Preview shows table shapes, positions, and seat arrangements. Tables can be repositioned in the seating manager after configuration.
                </p>
              </div>
            </div>
          )}

          {/* Classroom Configuration */}
          {layoutType === 'classroom' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-brand-navy">
                  Classroom Configuration
                </h3>
              </div>

              {/* Classroom Layout Type Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-md font-semibold text-brand-navy mb-4">
                  Seating Layout Type
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleClassroomLayoutTypeChange('uniform')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      classroomLayoutType === 'uniform'
                        ? 'border-brand-navy bg-brand-navy/5'
                        : 'border-gray-200 hover:border-brand-navy/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Grid3X3 className="w-6 h-6 text-brand-navy" />
                      <span className="text-lg font-semibold text-brand-navy">Uniform Seating</span>
                    </div>
                    <p className="text-sm text-brand-gray">
                      All rows have the same number of seats. Simple and consistent layout.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClassroomLayoutTypeChange('variable')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      classroomLayoutType === 'variable'
                        ? 'border-brand-navy bg-brand-navy/5'
                        : 'border-gray-200 hover:border-brand-navy/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Settings className="w-6 h-6 text-brand-navy" />
                      <span className="text-lg font-semibold text-brand-navy">Variable Seating</span>
                    </div>
                    <p className="text-sm text-brand-gray">
                      Each row can have different numbers of seats. Flexible for complex room layouts.
                    </p>
                  </button>
                </div>
              </div>

              {/* Uniform Seating Configuration */}
              {classroomLayoutType === 'uniform' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-brand-navy mb-4">
                    Uniform Layout Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Number of Rows
                        </label>
                        <input
                          type="number"
                          value={classroomConfig.rows}
                          onChange={(e) => setClassroomConfig(prev => ({ 
                            ...prev, 
                            rows: parseInt(e.target.value) || 1 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                          min="1"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Number of Columns
                        </label>
                        <input
                          type="number"
                          value={classroomConfig.columns}
                          onChange={(e) => setClassroomConfig(prev => ({ 
                            ...prev, 
                            columns: parseInt(e.target.value) || 1 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                          min="1"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Section Divider (seats per section)
                        </label>
                        <input
                          type="number"
                          value={classroomConfig.sectionDivider || ''}
                          onChange={(e) => setClassroomConfig(prev => ({ 
                            ...prev, 
                            sectionDivider: parseInt(e.target.value) || undefined
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                          min="2"
                          max={classroomConfig.columns}
                          placeholder="Optional"
                        />
                        <p className="text-xs text-brand-gray mt-1">
                          Creates walkways every N seats (e.g., 10 = walkway after every 10 seats)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Horizontal Spacing (px)
                        </label>
                        <input
                          type="number"
                          value={classroomConfig.seatSpacing.horizontal}
                          onChange={(e) => setClassroomConfig(prev => ({ 
                            ...prev, 
                            seatSpacing: { 
                              ...prev.seatSpacing, 
                              horizontal: parseInt(e.target.value) || 60 
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                          min="40"
                          max="120"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-brand-navy mb-2">
                          Vertical Spacing (px)
                        </label>
                        <input
                          type="number"
                          value={classroomConfig.seatSpacing.vertical}
                          onChange={(e) => setClassroomConfig(prev => ({ 
                            ...prev, 
                            seatSpacing: { 
                              ...prev.seatSpacing, 
                              vertical: parseInt(e.target.value) || 60 
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                          min="40"
                          max="120"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Variable Seating Configuration */}
              {classroomLayoutType === 'variable' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-brand-navy">
                      Variable Layout Settings
                    </h4>
                    <button
                      type="button"
                      onClick={addVariableRow}
                      className="inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Row
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {classroomConfig.variableRows.map((row, index) => (
                      <div key={row.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-brand-navy">
                            Row {index + 1}
                          </h5>
                          {classroomConfig.variableRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariableRow(row.id)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-brand-navy mb-2">
                              Total Seats in Row *
                            </label>
                            <input
                              type="number"
                              value={row.columns}
                              onChange={(e) => updateVariableRow(row.id, 'columns', parseInt(e.target.value) || 1)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent ${
                                row.columns < 1 ? 'border-red-500' : 'border-gray-300'
                              }`}
                              min="1"
                              max="50"
                            />
                            {row.columns < 1 && (
                              <p className="text-xs text-red-600 mt-1">Must have at least 1 seat</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-brand-navy mb-2">
                              Seats per Section (Optional)
                            </label>
                            <input
                              type="number"
                              value={row.sectionDivider || ''}
                              onChange={(e) => updateVariableRow(row.id, 'sectionDivider', parseInt(e.target.value) || undefined)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent ${
                                row.sectionDivider && row.sectionDivider > row.columns ? 'border-red-500' : 'border-gray-300'
                              }`}
                              min="1"
                              max={row.columns}
                              placeholder="Optional"
                            />
                            {row.sectionDivider && row.sectionDivider > row.columns && (
                              <p className="text-xs text-red-600 mt-1">
                                Seats per section cannot be greater than total seats in row
                              </p>
                            )}
                            <p className="text-xs text-brand-gray mt-1">
                              Creates aisles every N seats in this row
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {classroomConfig.variableRows.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Grid3X3 className="w-8 h-8 text-brand-gray mx-auto mb-2" />
                        <p className="text-brand-gray mb-3">No rows configured yet</p>
                        <button
                          type="button"
                          onClick={addVariableRow}
                          className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Row
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classroom Grid Preview */}
              {classroomLayoutType === 'uniform' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-brand-navy mb-3">
                    Classroom Layout Preview
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-lg overflow-auto border-2 border-gray-200">
                    <div className="inline-block">
                      {/* Front of Room Indicator */}
                      <div className="mb-4 text-center">
                        <div className="inline-block bg-brand-navy text-white px-4 py-1 rounded text-xs font-semibold">
                          FRONT OF ROOM
                        </div>
                      </div>
                      
                      {Array.from({ length: classroomConfig.rows }, (_, rowIndex) => (
                        <div key={rowIndex} className="flex items-center space-x-1 mb-1">
                          <span className="w-8 text-xs text-brand-gray text-right mr-2">
                            {String.fromCharCode(65 + rowIndex)}
                          </span>
                          {Array.from({ length: classroomConfig.columns }, (_, colIndex) => {
                            const showDivider = classroomConfig.sectionDivider && 
                                                 (colIndex + 1) % classroomConfig.sectionDivider === 0 && 
                                                 colIndex < classroomConfig.columns - 1
                              
                            return (
                              <React.Fragment key={colIndex}>
                                <div
                                  className="w-8 h-8 text-xs font-semibold rounded border-2 bg-blue-100 border-blue-300 text-blue-700 flex items-center justify-center"
                                >
                                  {colIndex + 1}
                                </div>
                                {showDivider && (
                                  <div className="w-1 h-8 bg-blue-300 rounded-full mr-2"></div>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-brand-gray mt-2">
                    Preview of classroom seating layout with section dividers.
                  </p>
                </div>
              )}

              {/* Variable Seating Preview */}
              {classroomLayoutType === 'variable' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-brand-navy mb-3">
                    Variable Layout Preview
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-lg overflow-auto border-2 border-gray-200">
                    <div className="inline-block">
                      {/* Front of Room Indicator */}
                      <div className="mb-4 text-center">
                        <div className="inline-block bg-brand-navy text-white px-4 py-1 rounded text-xs font-semibold">
                          FRONT OF ROOM
                        </div>
                      </div>
                      
                      {classroomConfig.variableRows.map((row, rowIndex) => (
                        <div key={row.id} className="flex items-center space-x-1 mb-1">
                          <span className="w-12 text-xs text-brand-gray text-right mr-2">
                            Row {rowIndex + 1}
                          </span>
                          {Array.from({ length: row.columns }, (_, colIndex) => {
                            const showDivider = row.sectionDivider && 
                                                 (colIndex + 1) % row.sectionDivider === 0 && 
                                                 colIndex < row.columns - 1
                              
                            return (
                              <React.Fragment key={colIndex}>
                                <div
                                  className="w-8 h-8 text-xs font-semibold rounded border-2 bg-blue-100 border-blue-300 text-blue-700 flex items-center justify-center"
                                >
                                  {colIndex + 1}
                                </div>
                                {showDivider && (
                                  <div className="w-1 h-8 bg-blue-300 rounded-full mr-2"></div>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-brand-gray mt-2">
                    Preview of variable classroom seating layout. Each row can have different numbers of seats.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Capacity Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-brand-navy">Total Seating Capacity:</span>
                <span className={`ml-2 text-lg font-bold ${
                  isCapacityValid() ? 'text-brand-navy' : 'text-red-600'
                }`}>
                  {getTotalCapacity()}
                </span>
                {/* Use currentEventCapacity for display */}
                {(currentEventCapacity !== undefined && currentEventCapacity !== null) && (
                  <span className="text-sm text-brand-gray ml-2">
                    / {currentEventCapacity} event max
                  </span>
                )}
              </div>
              {!isCapacityValid() && (
                <span className="text-sm text-red-600 font-semibold">
                  Exceeds event maximum capacity!
                </span>
              )}
            </div>
            
            {layoutType === 'table' && (
              <div className="mt-2 text-sm text-brand-gray">
                {tableConfig.tables.length} tables • Average {Math.round(getTotalCapacity() / tableConfig.tables.length)} seats per table
              </div>
            )}
            
            {layoutType === 'classroom' && (
              <div className="mt-2 text-sm text-brand-gray">
                {classroomConfig.layoutType === 'variable' ? (
                  <>
                    {classroomConfig.variableRows.length} variable rows
                    {classroomConfig.variableRows.some(row => row.sectionDivider) && (
                      <span> • Variable sections per row</span>
                    )}
                  </>
                ) : (
                  <>
                    {classroomConfig.rows} × {classroomConfig.columns} grid
                    {classroomConfig.sectionDivider && (
                      <span> • {Math.floor(classroomConfig.columns / classroomConfig.sectionDivider)} section(s)</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {saveError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center space-x-2">
              <X className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600 font-medium">{saveError}</span>
            </div>
          </div>
        )}

        {/* Action Buttons - Fixed Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isCapacityValid() || capacityLoading} // Disable if capacity is still loading
            className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : (mode === 'configure' && existingConfig ? 'Update Configuration' : 'Save Configuration')}
          </button>
        </div>
      </div>
    </div>
  )
}