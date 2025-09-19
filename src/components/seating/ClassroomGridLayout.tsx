import React from 'react'
import { useDrop } from 'react-dnd'
import { X } from 'lucide-react'
import { getAttendeeCategoryColor } from '../../utils/seatingColors'
import { getAttendeeById } from '../../utils/attendeeUtils'

interface ClassroomGridLayoutProps {
  classroomConfig: any
  assignments: Map<string, any>
  attendees: any[]
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  onSeatAssignment: (attendeeId: string, row: number, column: number) => void
  onRemoveAssignment: (row: number, column: number) => void
}

interface GridCellProps {
  row: number
  column: number
  attendee?: any
  isPendingAssignment?: boolean
  hasSectionDivider?: boolean
  onSeatAssignment: (attendeeId: string, row: number, column: number) => void
  onRemoveAssignment: (row: number, column: number) => void
}

function GridCell({ 
  row, 
  column, 
  attendee, 
  isPendingAssignment = false,
  hasSectionDivider = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: GridCellProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'attendee',
    drop: (item: { attendee: any }) => {
      // Regular attendee assignment
      onSeatAssignment(item.attendee.id || item.attendee, row, column)
    },
    canDrop: () => !attendee,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemoveAssignment(row, column)
  }

  const getCellStyle = () => {
    let baseStyle = 'border border-gray-300 p-2 text-center text-xs relative transition-all duration-200 min-w-[120px] h-16'
    
    // Add section divider styling
    if (hasSectionDivider) {
      baseStyle += ' border-r-4 border-r-black'
    }
    
    if (attendee) {
      if (isPendingAssignment) {
        return baseStyle + ' bg-yellow-100 border-yellow-500 text-yellow-800 animate-pulse cursor-pointer'
      } else {
        const colorInfo = getAttendeeCategoryColor(attendee)
        // Convert Tailwind classes to actual CSS classes for table cells
        const bgColorMap: { [key: string]: string } = {
          'bg-chart-red': 'bg-red-500',
          'bg-sector-tech': 'bg-orange-500', 
          'bg-light-purple': 'bg-purple-400',
          'bg-dark-purple': 'bg-purple-800',
          'bg-chart-green': 'bg-green-400',
          'bg-sector-services': 'bg-blue-400',
          'bg-brand-navy/20': 'bg-gray-300'
        }
        return baseStyle + ` ${bgColorMap[colorInfo.bgColor] || 'bg-gray-300'} text-white font-semibold hover:opacity-90 cursor-pointer`
      }
    }
    
    if (isOver && canDrop) {
      return baseStyle + ' bg-green-100 border-green-500 text-green-700'
    }
    
    if (isOver && !canDrop) {
      return baseStyle + ' bg-red-100 border-red-500 text-red-700'
    }
    
    return baseStyle + ' bg-white hover:bg-gray-50 cursor-pointer'
  }

  const firstName = attendee?.firstName || attendee?.first_name
  const lastName = attendee?.lastName || attendee?.last_name

  return (
    <td
      ref={drop}
      onClick={attendee ? handleRemove : undefined}
      className={getCellStyle()}
    >
      {attendee ? (
        <div className="relative group">
          <div className="font-semibold leading-tight text-xs">
            {firstName} {lastName}
          </div>
          <div className="text-xs opacity-90 mt-1 leading-tight">
            {attendee.company}
          </div>
          {isPendingAssignment && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          )}
          <button
            onClick={handleRemove}
            className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600 text-xs"
          >
            <X className="w-2 h-2" />
          </button>
        </div>
      ) : (
        <div className="text-gray-500 font-medium">Open</div>
      )}
    </td>
  )
}

export default function ClassroomGridLayout({ 
  classroomConfig, 
  assignments, 
  attendees, 
  priorityNetworkingInfo = new Map(),
  companiesWithSeatingRequests = [],
  onSeatAssignment, 
  onRemoveAssignment 
}: ClassroomGridLayoutProps) {
  

  const getSectionDividerColumns = (rowIndex: number) => {
    let sectionDivider: number | undefined
    
    if (classroomConfig.layoutType === 'variable' && classroomConfig.variableRows) {
      sectionDivider = classroomConfig.variableRows[rowIndex]?.sectionDivider
    } else {
      sectionDivider = classroomConfig.sectionDivider
    }
    
    if (!sectionDivider) return []
    
    const maxColumns = getMaxColumnsForRow(rowIndex)
    const dividers = []
    for (let i = sectionDivider; i < maxColumns; i += sectionDivider) {
      dividers.push(i - 1) // Adjust to be zero-indexed for column positions
    }
    return dividers
  }

  const getMaxColumnsForRow = (rowIndex: number) => {
    if (classroomConfig.layoutType === 'variable' && classroomConfig.variableRows) {
      return classroomConfig.variableRows[rowIndex]?.columns || 0
    }
    return classroomConfig.columns
  }

  const getTotalRows = () => {
    if (classroomConfig.layoutType === 'variable') {
      return classroomConfig.variableRows.length
    }
    return classroomConfig.rows
  }

  const getMaxColumns = () => {
    if (classroomConfig.layoutType === 'variable') {
      return Math.max(...classroomConfig.variableRows.map(row => row.columns))
    }
    return classroomConfig.columns
  }

  return (
    <div className="flex-1 bg-white overflow-auto flex flex-col">
      {/* Front of Room Indicator */}
      <div className="text-center py-4 border-b border-gray-200">
        <div className="inline-block bg-brand-navy text-white px-8 py-2 rounded-lg font-semibold">
          FRONT OF ROOM
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400">
            {/* Table Header */}
            <thead>
              <tr>
                <th className="border border-gray-400 bg-gray-100 p-3 text-sm font-semibold text-brand-navy sticky left-0 z-10">
                  Seat →
                </th>
                {Array.from({ length: getMaxColumns() }, (_, colIndex) => (
                  <th
                    key={colIndex}
                    className="border border-gray-400 bg-gray-100 p-3 text-sm font-semibold text-brand-navy min-w-[120px]"
                  >
                    {colIndex + 1}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody>
              {Array.from({ length: getTotalRows() }, (_, rowIndex) => {
                const maxColumnsInRow = getMaxColumnsForRow(rowIndex)
                const sectionDividerColumns = getSectionDividerColumns(rowIndex)
                
                return (
                <tr key={rowIndex}>
                  {/* Row Header */}
                  <td className="border border-gray-400 bg-gray-100 p-3 text-sm font-semibold text-brand-navy text-center sticky left-0 z-10">
                    Row {rowIndex + 1}
                    {classroomConfig.layoutType === 'variable' && (
                      <div className="text-xs text-brand-gray mt-1">
                        {maxColumnsInRow} seats
                      </div>
                    )}
                  </td>
                  
                  {/* Seat Cells */}
                  {Array.from({ length: getMaxColumns() }, (_, colIndex) => {
                    // Check if this column exists in this row for variable seating
                    if (classroomConfig.layoutType === 'variable' && colIndex >= maxColumnsInRow) {
                      return (
                        <td key={colIndex} className="border border-gray-400 bg-gray-200 p-3">
                          <div className="text-gray-400 text-xs">N/A</div>
                        </td>
                      )
                    }
                    
                    const assignmentKey = `${rowIndex}-${colIndex}`
                    const assignment = assignments.get(assignmentKey)
                    
                    const attendee = assignment ? getAttendeeById(assignment.attendeeId, attendees) : null
                    const hasSectionDivider = sectionDividerColumns.includes(colIndex)
                    
                    return (
                      <GridCell
                        key={colIndex}
                        row={rowIndex}
                        column={colIndex}
                        attendee={attendee}
                        isPendingAssignment={assignment && !assignment.saved}
                        hasSectionDivider={hasSectionDivider}
                        onSeatAssignment={onSeatAssignment}
                        onRemoveAssignment={onRemoveAssignment}
                      />
                    )
                  })}
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend - Fixed at bottom of component */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <h4 className="text-sm font-semibold text-brand-navy mb-3">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Attendee Color Coding */}
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Attendee Categories:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 border border-red-600"></div>
                <span>CEO + Portfolio Executive</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 border border-orange-600"></div>
                <span>Vendors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-400 border border-purple-500"></div>
                <span>Apax IP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-800 border border-purple-900"></div>
                <span>Apax EP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-400 border border-green-500"></div>
                <span>Apax OEP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-400 border border-blue-500"></div>
                <span>Portfolio Executives</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 border border-gray-400"></div>
                <span>Other and Guests</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Seat Status:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border border-gray-300"></div>
                <span>Available Seat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-500"></div>
                <span>Pending Assignment</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Interaction:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span>• Drag attendees to "Open" seats</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>• Click assigned seats to remove</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>• Black lines indicate section dividers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}