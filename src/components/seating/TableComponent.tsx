import React from 'react'
import SeatComponent from './SeatComponent'

interface TableComponentProps {
  table: any
  assignments: Map<string, any>
  getAttendeeById: (id: string) => any
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  allAttendees?: any[]
  isManageMode?: boolean
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

export default function TableComponent({ 
  table, 
  assignments, 
  getAttendeeById, 
  priorityNetworkingInfo = new Map(),
  companiesWithSeatingRequests = [],
  allAttendees = [],
  isManageMode = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: TableComponentProps) {
  
  const getSeatsAroundTable = (capacity: number) => {
    const seats = []
    const centerX = table.position.x
    const centerY = table.position.y
    
    if (table.shape === 'rectangle') {
      // Rectangle table - distribute seats around perimeter
      const tableWidth = 120
      const tableHeight = 60
      const perimeter = 2 * (tableWidth + tableHeight)
      const seatSpacing = perimeter / capacity
      
      for (let i = 0; i < capacity; i++) {
        const currentDistance = i * seatSpacing
        let x, y
        
        if (currentDistance <= tableWidth) {
          // Top edge
          x = centerX - tableWidth/2 + currentDistance
          y = centerY - tableHeight/2 - 20
        } else if (currentDistance <= tableWidth + tableHeight) {
          // Right edge
          x = centerX + tableWidth/2 + 20
          y = centerY - tableHeight/2 + (currentDistance - tableWidth)
        } else if (currentDistance <= 2 * tableWidth + tableHeight) {
          // Bottom edge
          x = centerX + tableWidth/2 - (currentDistance - tableWidth - tableHeight)
          y = centerY + tableHeight/2 + 20
        } else {
          // Left edge
          x = centerX - tableWidth/2 - 20
          y = centerY + tableHeight/2 - (currentDistance - 2 * tableWidth - tableHeight)
        }
        
        seats.push({
          seatNumber: i + 1,
          position: { x, y }
        })
      }
    } else {
      // Round table - distribute seats in circle
      const radius = 60
      
      for (let i = 0; i < capacity; i++) {
        const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2 // Start from top
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        seats.push({
          seatNumber: i + 1,
          position: { x, y }
        })
      }
    }
    
    return seats
  }

  const seats = getSeatsAroundTable(table.capacity)

  return (
    <div className="absolute">
      {/* Table */}
      <div
        className={`absolute bg-gray-200 border-2 border-gray-400 flex items-center justify-center font-semibold text-brand-navy ${
          table.shape === 'rectangle' ? 'rounded-lg' : 'rounded-full'
        }`}
        style={{
          left: table.shape === 'rectangle' ? table.position.x - 60 : table.position.x - 40,
          top: table.shape === 'rectangle' ? table.position.y - 30 : table.position.y - 40,
          width: table.shape === 'rectangle' ? 120 : 80,
          height: table.shape === 'rectangle' ? 60 : 80
        }}
      >
        <span className="text-sm">{table.name}</span>
      </div>

      {/* Seats */}
      {seats.map((seat) => {
        const assignmentKey = `${table.name}-${seat.seatNumber}`
        const assignment = assignments.get(assignmentKey)
        const attendee = assignment ? getAttendeeById(assignment.attendeeId) : null
        const priorityInfo = attendee ? priorityNetworkingInfo.get(attendee.id) : null
        
        return (
          <SeatComponent
            key={seat.seatNumber}
            tableName={table.name}
            seatNumber={seat.seatNumber}
            position={seat.position}
            attendee={attendee}
            priorityNetworkingInfo={priorityInfo}
            companiesWithSeatingRequests={companiesWithSeatingRequests}
            allAttendees={allAttendees}
            isPendingAssignment={assignment && !assignment.saved}
            isManageMode={isManageMode}
            onSeatAssignment={onSeatAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
        )
      })}
    </div>
  )
}