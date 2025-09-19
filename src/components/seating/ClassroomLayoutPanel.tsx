import React, { useState, useRef, useEffect } from 'react'
import ClassroomSeatComponent from './ClassroomSeatComponent'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { getAttendeeById } from '../../utils/attendeeUtils'

interface ClassroomLayoutPanelProps {
  classroomConfig: any
  assignments: Map<string, any>
  attendees: any[]
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  onSeatAssignment: (attendeeId: string, row: number, column: number) => void
  onRemoveAssignment: (row: number, column: number) => void
}

export default function ClassroomLayoutPanel({ 
  classroomConfig, 
  assignments, 
  attendees, 
  priorityNetworkingInfo = new Map(),
  companiesWithSeatingRequests = [],
  onSeatAssignment, 
  onRemoveAssignment 
}: ClassroomLayoutPanelProps) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Enhanced zoom levels with 10% increments
  const zoomLevels = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]
  const currentZoomIndex = zoomLevels.indexOf(zoomLevel)
  
  const handleZoomIn = () => {
    const nextIndex = Math.min(currentZoomIndex + 1, zoomLevels.length - 1)
    setZoomLevel(zoomLevels[nextIndex])
  }
  
  const handleZoomOut = () => {
    const nextIndex = Math.max(currentZoomIndex - 1, 0)
    setZoomLevel(zoomLevels[nextIndex])
  }
  
  const handleFitToScreen = () => {
    if (!containerRef.current || !contentRef.current) return
    
    const container = containerRef.current
    const containerWidth = container.clientWidth - 32 // Account for padding
    const containerHeight = container.clientHeight - 32
    
    // Calculate content dimensions
    const contentWidth = 200 + (classroomConfig.columns * (classroomConfig.seatSpacing?.horizontal || 60)) + 100
    const contentHeight = 200 + (classroomConfig.rows * (classroomConfig.seatSpacing?.vertical || 60)) + 100
    
    // Calculate zoom to fit
    const widthRatio = containerWidth / contentWidth
    const heightRatio = containerHeight / contentHeight
    const optimalZoom = Math.min(widthRatio, heightRatio, 2) // Cap at 2x zoom
    
    // Find closest zoom level
    const closestZoom = zoomLevels.reduce((prev, curr) => 
      Math.abs(curr - optimalZoom) < Math.abs(prev - optimalZoom) ? curr : prev
    )
    
    setZoomLevel(closestZoom)
  }

  const isUnavailable = (row: number, column: number) => {
    return classroomConfig.unavailableSeats?.some(
      (seat: any) => seat.row === row && seat.column === column
    )
  }

  const getSeatPosition = (row: number, column: number) => {
    const baseX = 100
    const baseY = 150
    const verticalSpacing = (classroomConfig.seatSpacing?.vertical || 60) * zoomLevel
    
    let horizontalSpacing = (classroomConfig.seatSpacing?.horizontal || 60) * zoomLevel
    let extraSpacing = 0
    
    if (classroomConfig.layoutType === 'variable' && classroomConfig.variableRows) {
      // For variable seating, use the specific row's section divider
      const rowConfig = classroomConfig.variableRows[row]
      if (rowConfig?.sectionDivider) {
        extraSpacing = Math.floor(column / rowConfig.sectionDivider) * (20 * zoomLevel)
      }
    } else {
      // For uniform seating, use the global section divider
      if (classroomConfig.sectionDivider) {
        extraSpacing = Math.floor(column / classroomConfig.sectionDivider) * (20 * zoomLevel)
      }
    }
    
    return {
      x: (baseX * zoomLevel) + (column * horizontalSpacing) + extraSpacing,
      y: (baseY * zoomLevel) + (row * verticalSpacing)
    }
  }

  const getMaxColumnsForRow = (row: number) => {
    if (classroomConfig.layoutType === 'variable' && classroomConfig.variableRows) {
      return classroomConfig.variableRows[row]?.columns || 0
    }
    return classroomConfig.columns
  }

  return (
    <>
      <div className="flex-1 bg-white overflow-auto relative" ref={containerRef}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={currentZoomIndex === 0}
            className="p-2 text-brand-gray hover:text-brand-navy disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-semibold text-brand-navy min-w-[3rem] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            disabled={currentZoomIndex === zoomLevels.length - 1}
            className="p-2 text-brand-gray hover:text-brand-navy disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          <button
            onClick={handleFitToScreen}
            className="p-2 text-brand-gray hover:text-brand-navy rounded hover:bg-gray-100"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={contentRef}
        className="relative min-h-full p-8" 
        style={{ 
          minWidth: `${(100 + (classroomConfig.columns * 60) + 100) * zoomLevel}px`, 
          minHeight: `${(150 + (classroomConfig.rows * 60) + 100) * zoomLevel}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left'
        }}>
        {/* Front of Room */}
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2"
          style={{ transform: `translateX(-50%) scale(${1/zoomLevel})` }}
        >
          <div className="bg-brand-navy text-white px-8 py-3 rounded-lg font-semibold">
            FRONT OF ROOM
          </div>
        </div>

        {/* Row Labels */}
        {Array.from({ length: classroomConfig.rows }, (_, rowIndex) => (
          <div
            key={`row-label-${rowIndex}`}
            className="absolute text-sm font-semibold text-brand-gray select-none"
            style={{
              left: 20 / zoomLevel,
              top: getSeatPosition(rowIndex, 0).y - 4
            }}
          >
            Row {rowIndex + 1}
          </div>
        ))}

        {/* Seats */}
        {Array.from({ length: classroomConfig.layoutType === 'variable' ? classroomConfig.variableRows.length : classroomConfig.rows }, (_, rowIndex) => 
          Array.from({ length: getMaxColumnsForRow(rowIndex) }, (_, colIndex) => {

            const assignmentKey = `${rowIndex}-${colIndex}`
            const assignment = assignments.get(assignmentKey)
            
            const attendee = assignment ? getAttendeeById(assignment.attendeeId, attendees) : null
            
            const priorityInfo = attendee ? priorityNetworkingInfo.get(attendee.id) : null
            const position = getSeatPosition(rowIndex, colIndex)

            return (
              <ClassroomSeatComponent
                key={`${rowIndex}-${colIndex}`}
                row={rowIndex}
                column={colIndex}
                position={position}
                attendee={attendee}
                priorityNetworkingInfo={priorityInfo}
                companiesWithSeatingRequests={companiesWithSeatingRequests}
                allAttendees={attendees}
                isPendingAssignment={assignment && !assignment.saved}
                onSeatAssignment={onSeatAssignment}
                onRemoveAssignment={onRemoveAssignment}
              />
            )
          })
        )}

      </div>

        {/* Legend - Moved to bottom of page */}
      </div>

      {/* Legend - Fixed at bottom outside of scaled content */}
      <div className="bg-white border-t border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-brand-navy mb-3">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Attendee Color Coding */}
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Attendee Categories:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-chart-red border-2 border-chart-red"></div>
                <span>CEO + Portfolio Executive</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-sector-tech border-2 border-sector-tech"></div>
                <span>Vendors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-light-purple border-2 border-light-purple"></div>
                <span>Apax IP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-purple-800 border-2 border-purple-800"></div>
                <span>Apax EP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-chart-green border-2 border-chart-green"></div>
                <span>Apax OEP</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-sector-services border-2 border-sector-services"></div>
                <span>Portfolio Executives</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-brand-navy/20 border-2 border-brand-navy"></div>
                <span>Other and Guests</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Seat Status:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                <span>Available Seat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-brand-navy/20 border-2 border-brand-navy"></div>
                <span>Assigned Seat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-100 border-2 border-yellow-500"></div>
                <span>Pending Assignment</span>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs font-semibold text-brand-navy mb-2">Layout Elements:</p>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-4 bg-blue-300 rounded-full"></div>
                <span>Section Divider</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-3 bg-brand-navy rounded text-white text-xs flex items-center justify-center">F</div>
                <span>Front of Room</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}