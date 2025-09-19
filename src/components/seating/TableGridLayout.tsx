import React from 'react'
import { useDrop } from 'react-dnd'
import { X, Building } from 'lucide-react'
import { getAttendeeCategoryColor } from '../../utils/seatingColors'
import { getAttendeeById } from '../../utils/attendeeUtils'

interface TableGridLayoutProps {
  tables: any[]
  assignments: Map<string, any>
  attendees: any[]
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

interface GridCellProps {
  tableName: string
  seatNumber: number
  attendee?: any
  isPendingAssignment?: boolean
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

function GridCell({ 
  tableName, 
  seatNumber, 
  attendee, 
  isPendingAssignment = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: GridCellProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'attendee',
    drop: (item: { attendee: any }) => {
      // Allow dropping on empty seats only
      if (!attendee) {
        onSeatAssignment(item.attendee.id || item.attendee, tableName, seatNumber)
      }
    },
    canDrop: () => !attendee, // Can drop on empty seats only
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemoveAssignment(tableName, seatNumber)
  }

  const getCellStyle = () => {
    let baseStyle = 'border border-gray-300 p-3 text-center text-xs relative transition-all duration-200 min-w-[140px] h-20'
    
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
          <div className="font-semibold leading-tight text-sm">
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

export default function TableGridLayout({ 
  tables, 
  assignments, 
  attendees, 
  onSeatAssignment, 
  onRemoveAssignment 
}: TableGridLayoutProps) {
  
  // Calculate maximum seats per table for consistent grid
  const maxSeatsPerTable = Math.max(...tables.map(table => table.capacity))
  
  return (
    <div className="flex-1 bg-white overflow-auto flex flex-col">
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-200">
        <div className="inline-block bg-brand-navy text-white px-8 py-2 rounded-lg font-semibold">
          TABLE SEATING GRID VIEW
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
                  Table / Seat →
                </th>
                {Array.from({ length: maxSeatsPerTable }, (_, seatIndex) => (
                  <th
                    key={seatIndex}
                    className="border border-gray-400 bg-gray-100 p-3 text-sm font-semibold text-brand-navy min-w-[140px]"
                  >
                    Seat {seatIndex + 1}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody>
              {tables.map((table) => (
                <tr key={table.name}>
                  {/* Table Name Header */}
                  <td className="border border-gray-400 bg-gray-100 p-3 text-sm font-semibold text-brand-navy text-center sticky left-0 z-10">
                    {table.name}
                    <div className="text-xs text-brand-gray mt-1">
                      {table.capacity} seats
                    </div>
                  </td>
                  
                  {/* Seat Cells */}
                  {Array.from({ length: maxSeatsPerTable }, (_, seatIndex) => {
                    if (seatIndex >= table.capacity) {
                      // Empty cell for tables with fewer seats
                      return (
                        <td key={seatIndex} className="border border-gray-400 bg-gray-200 p-3">
                          <div className="text-gray-400 text-xs">N/A</div>
                        </td>
                      )
                    }
                    
                    const assignmentKey = `${table.name}-${seatIndex + 1}`
                    const assignment = assignments.get(assignmentKey)
                    const attendee = assignment ? getAttendeeById(assignment.attendeeId, attendees) : null
                    
                    return (
                      <GridCell
                        key={seatIndex}
                        tableName={table.name}
                        seatNumber={seatIndex + 1}
                        attendee={attendee}
                        isPendingAssignment={assignment && !assignment.saved}
                        onSeatAssignment={onSeatAssignment}
                        onRemoveAssignment={onRemoveAssignment}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend - Fixed at bottom */}
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
                <div className="w-4 h-4 bg-gray-200 border border-gray-400"></div>
                <span>N/A (Table Full)</span>
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
                <span>• Each row represents a table</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}