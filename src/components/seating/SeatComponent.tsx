import React, { useState } from 'react'
import { useDrop } from 'react-dnd'
import { X, Building } from 'lucide-react'
import { getAttendeeCategoryColor } from '../../utils/seatingColors'
import SeatHoverModal from './SeatHoverModal'


interface SeatComponentProps {
  tableName: string
  seatNumber: number
  position: { x: number; y: number }
  attendee?: any
  priorityNetworkingInfo?: any
  companiesWithSeatingRequests?: any[]
  allAttendees?: any[]
  companiesWithSeatingRequests?: any[]
  allAttendees?: any[]
  isPendingAssignment?: boolean
  isManageMode?: boolean
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

export default function SeatComponent({ 
  tableName, 
  seatNumber, 
  position, 
  attendee, 
  priorityNetworkingInfo,
  companiesWithSeatingRequests = [],
  allAttendees = [],
  isPendingAssignment = false,
  isManageMode = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: SeatComponentProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'attendee',
    drop: (item: { attendee: any }) => {
      // Allow dropping on empty seats
      if (!attendee) {
        onSeatAssignment(item.attendee, tableName, seatNumber)
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

  const handleSeatClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // In manage mode, clicking an occupied seat removes the assignment
    if (isManageMode && attendee) {
      onRemoveAssignment(tableName, seatNumber)
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
        return `${colorInfo.bgColor} ${colorInfo.borderColor} ${colorInfo.textColor} font-bold shadow-sm hover:shadow-md ${priorityBorder} ${
          isManageMode ? 'hover:bg-red-100 hover:border-red-500 hover:text-red-700 cursor-pointer' : ''
        }`
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
    if (!attendee) return seatNumber.toString()
    
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
        className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all duration-200 cursor-pointer ${getSeatStyle()}`}
        style={{ 
          left: position.x - 16, 
          top: position.y - 16,
          transform: isOver ? 'scale(1.1)' : 'scale(1)'
        }}
        title={
          attendee 
              ? `${firstName} ${lastName}${isManageMode ? ' (Click to unassign)' : ''}` 
              : `Seat ${seatNumber}`
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
          <span>{seatNumber}</span>
        )}
      </div>
      
      {showTooltip && attendee && attendee.id !== 'BLOCKED' && attendee !== 'BLOCKED' && (
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