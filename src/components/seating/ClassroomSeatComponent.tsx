import React, { useState } from 'react'
import { useDrop } from 'react-dnd'
import { X, Building } from 'lucide-react'
import { getAttendeeCategoryColor } from '../../utils/seatingColors'
import SeatHoverModal from './SeatHoverModal'


interface ClassroomSeatComponentProps {
  row: number
  column: number
  position: { x: number; y: number }
  attendee?: any
  priorityNetworkingInfo?: any
  companiesWithSeatingRequests?: any[]
  allAttendees?: any[]
  isPendingAssignment?: boolean
  onSeatAssignment: (attendeeId: string, row: number, column: number) => void
  onRemoveAssignment: (row: number, column: number) => void
}

export default function ClassroomSeatComponent({ 
  row, 
  column, 
  position, 
  attendee, 
  priorityNetworkingInfo,
  companiesWithSeatingRequests = [],
  allAttendees = [],
  isPendingAssignment = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: ClassroomSeatComponentProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'attendee',
    drop: (item: { attendee: any }) => {
      // Allow dropping on empty seats only
      if (!attendee) {
        onSeatAssignment(item.attendee, row, column)
      }
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

  const handleSeatClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // For assigned attendees, allow removal by clicking
    if (attendee) {
      onRemoveAssignment(row, column)
    }
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Only show hover modal for occupied seats (Requirement B)
    if (attendee) {
      const rect = e.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left,
        y: rect.top
      })
      setShowTooltip(true)
    }
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const getSeatStyle = () => {
    if (attendee) {
      if (isPendingAssignment) {
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 shadow-md animate-pulse'
      } else {
        const colorInfo = getAttendeeCategoryColor(attendee, priorityNetworkingInfo?.isPriorityNetworking);
        const priorityBorder = priorityNetworkingInfo?.isPriorityNetworking ? 'ring-2 ring-yellow-400' : ''
        return `${colorInfo.bgColor} ${colorInfo.borderColor} ${colorInfo.textColor} font-bold shadow-sm hover:shadow-md ${priorityBorder}`;
      }
    }
    
    if (isOver && canDrop) {
      return 'bg-chart-green/20 border-chart-green text-chart-green shadow-lg scale-110'
    }
    if (isOver && !canDrop) {
      return 'bg-red-50 border-red-500 text-red-500 shadow-md'
    }
    return 'bg-white border-gray-300 text-brand-gray hover:border-brand-navy hover:shadow-sm'
  }

  const getAttendeeInitials = () => {
    if (!attendee) return (column + 1).toString()
    
    const firstName = attendee.firstName || attendee.first_name || ''
    const lastName = attendee.lastName || attendee.last_name || ''
    
    const firstInitial = firstName.charAt(0).toUpperCase()
    const lastInitial = lastName.charAt(0).toUpperCase()
    
    return `${firstInitial}${lastInitial}`
  }
  const firstName = attendee?.firstName || attendee?.first_name
  const lastName = attendee?.lastName || attendee?.last_name

  return (
    <>
      <div
        ref={drop}
        onClick={handleSeatClick}
        className={`absolute w-8 h-8 rounded border-2 flex items-center justify-center text-xs transition-all duration-200 cursor-pointer select-none ${getSeatStyle()}`}
        style={{ 
          left: position.x - 16, 
          top: position.y - 16,
          transform: isOver ? 'scale(1.1)' : 'scale(1)',
          fontSize: '10px' // Ensure text scales properly
        }}
        title={
          attendee 
              ? `${firstName} ${lastName}` 
              : `Row ${row + 1}, Seat ${column + 1}`
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {attendee ? (
          <div className="relative group">
            <span className="text-xs font-bold leading-none">
              {getAttendeeInitials()}
            </span>
            <button
              onClick={handleRemove}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-2 h-2" />
            </button>
            {isPendingAssignment && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs">{getAttendeeInitials()}</span>
        )}
      </div>
      
      {showTooltip && attendee && (
        <SeatHoverModal 
          attendee={attendee} 
          position={tooltipPosition}
          isVisible={showTooltip}
          priorityNetworkingInfo={priorityNetworkingInfo}
          companiesWithSeatingRequests={companiesWithSeatingRequests}
          allAttendees={allAttendees}
        />
      )}
    </>
  )
}