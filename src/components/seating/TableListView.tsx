import React from 'react'
import { useDrop } from 'react-dnd'
import { Users, User, X, Circle, Square } from 'lucide-react'
import { getAttendeeCategoryColor } from '../../utils/seatingColors'
import { getAttendeeById } from '../../utils/attendeeUtils'

interface TableListViewProps {
  tables: any[]
  assignments: Map<string, any>
  attendees: any[]
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

interface TableCardProps {
  table: any
  assignments: Map<string, any>
  attendees: any[]
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

function TableCard({ table, assignments, attendees, onSeatAssignment, onRemoveAssignment }: TableCardProps) {
  const getTableAssignments = () => {
    const tableAssignments = []
    for (let seatNumber = 1; seatNumber <= table.capacity; seatNumber++) {
      const assignmentKey = `${table.name}-${seatNumber}`
      const assignment = assignments.get(assignmentKey)
      const attendee = assignment ? getAttendeeById(assignment.attendeeId, attendees) : null
      
      tableAssignments.push({
        seatNumber,
        attendee,
        isPending: assignment && !assignment.saved
      })
    }
    return tableAssignments
  }

  const tableAssignments = getTableAssignments()
  const occupiedSeats = tableAssignments.filter(seat => seat.attendee).length
  const occupancyStatus = occupiedSeats === 0 ? 'Empty' : 
                         occupiedSeats === table.capacity ? 'Full' : 'Partial'

  const getOccupancyColor = () => {
    switch (occupancyStatus) {
      case 'Full': return 'text-green-600'
      case 'Partial': return 'text-yellow-600'
      case 'Empty': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div
      className="bg-white border-2 rounded-xl p-4 transition-all duration-200 border-gray-200 hover:border-gray-300 hover:shadow-md"
    >
      {/* Table Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-bold text-brand-navy">{table.name}</h3>
          {/* Bug Fix C: Update Table Type Icons */}
          <div className="flex items-center space-x-1 text-brand-gray">
              {table.shape === 'round' ? (
                <Circle className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="text-xs text-brand-gray capitalize">{table.shape || 'Round'}</span>
            </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-brand-gray" />
            <span className="text-sm font-semibold text-brand-navy">
              {table.capacity} seats
            </span>
          </div>
          <div className={`text-xs font-semibold ${getOccupancyColor()}`}>
            {occupiedSeats}/{table.capacity} occupied
          </div>
        </div>
      </div>

      {/* Bug Fix A: Remove Redundant Headers */}
      {/* Bug Fix B: Fix Drag and Drop Targeting - Apply useDrop to individual SeatRow */}
      <div className="grid grid-cols-1 gap-2">
        {tableAssignments.map((seat) => (
          <SeatRow
            key={seat.seatNumber}
            seat={seat}
            tableName={table.name}
            onSeatAssignment={onSeatAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
        ))}
      </div>

      {/* Table Status Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-brand-gray">Capacity: {table.capacity}</span>
          <span className={`font-semibold ${getOccupancyColor()}`}>
            {occupancyStatus}
          </span>
        </div>
      </div>
    </div>
  )
}

interface SeatRowProps {
  seat: {
    seatNumber: number
    attendee?: any
    isPending?: boolean
  }
  tableName: string
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

function SeatRow({ seat, tableName, onSeatAssignment, onRemoveAssignment }: SeatRowProps) {
  // Bug Fix B: Add useDrop to individual SeatRow
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'attendee',
    drop: (item: { attendee: any }) => {
      // Allow dropping on empty seats only
      if (!seat.attendee) {
        onSeatAssignment(item.attendee.id || item.attendee, tableName, seat.seatNumber)
      }
    },
    canDrop: () => !seat.attendee, // Can drop on empty seats only
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemoveAssignment(tableName, seat.seatNumber)
  }

  const getSeatRowStyle = () => {
    if (seat.attendee) {
      if (seat.isPending) {
        return 'bg-yellow-100 border-yellow-500 animate-pulse'
      } else {
        const colorInfo = getAttendeeCategoryColor(seat.attendee)
        return `${colorInfo.bgColor} ${colorInfo.borderColor}`
      }
    }
    if (isOver && canDrop) {
      return 'bg-green-100 border-green-500'
    }
    if (isOver && !canDrop) {
      return 'bg-red-100 border-red-500'
    }
    return 'bg-gray-50 border-gray-200 hover:border-gray-300'
  }

  if (!seat.attendee) {
    return (
      <div
        ref={drop}
        onClick={() => { /* No action on click for empty seat */ }}
        className={`flex items-center justify-between py-2 px-3 rounded border ${getSeatRowStyle()}`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-brand-gray">{seat.seatNumber}</span>
          <span className="text-sm text-brand-gray">Available</span>
        </div>
      </div>
    )
  }

  const colorInfo = getAttendeeCategoryColor(seat.attendee)
  const firstName = seat.attendee.firstName || seat.attendee.first_name
  const lastName = seat.attendee.lastName || seat.attendee.last_name

  return (
    <div
      ref={drop}
      onClick={handleRemove} // Click to remove assigned attendee
      className={`flex items-center justify-between py-2 px-3 rounded border-2 group hover:shadow-sm transition-all ${getSeatRowStyle()}`}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <span className="text-xs font-mono text-white bg-black bg-opacity-20 px-1 rounded">
          {seat.seatNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${colorInfo.textColor}`}>
            {firstName} {lastName}
          </div>
          <div className={`text-xs truncate ${colorInfo.textColor} opacity-90`}>
            {seat.attendee.company}
          </div>
        </div>
      </div>
      <button
        onClick={handleRemove}
        className="opacity-0 group-hover:opacity-100 p-1 text-white bg-red-500 rounded-full hover:bg-red-600 transition-all duration-200 flex-shrink-0"
        title="Remove assignment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function TableListView({ 
  tables, 
  assignments, 
  attendees, 
  priorityNetworkingInfo = new Map(),
  companiesWithSeatingRequests = [],
  onSeatAssignment, 
  onRemoveAssignment 
}: TableListViewProps) {
  
  return (
    <div className="flex-1 bg-gray-50 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <TableCard
            key={table.name}
            table={table}
            assignments={assignments}
            attendees={attendees}
            priorityNetworkingInfo={priorityNetworkingInfo}
            companiesWithSeatingRequests={companiesWithSeatingRequests}
            onSeatAssignment={onSeatAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
        ))}
      </div>
      
      {tables.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            No Tables Configured
          </h3>
          <p className="text-brand-gray">
            Configure table layouts in the seating configuration to get started.
          </p>
        </div>
      )}
    </div>
  )
}