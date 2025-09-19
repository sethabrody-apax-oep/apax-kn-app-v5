import React from 'react'
import TableComponent from './TableComponent'
import { getAttendeeById } from '../../utils/attendeeUtils'

interface TableLayoutPanelProps {
  tables: any[]
  assignments: Map<string, any>
  attendees: any[]
  priorityNetworkingInfo?: Map<string, any>
  companiesWithSeatingRequests?: any[]
  isManageMode?: boolean
  onSeatAssignment: (attendeeId: string, tableName: string, seatNumber: number) => void
  onRemoveAssignment: (tableName: string, seatNumber: number) => void
}

export default function TableLayoutPanel({ 
  tables, 
  assignments, 
  attendees, 
  priorityNetworkingInfo = new Map(),
  companiesWithSeatingRequests = [],
  isManageMode = false,
  onSeatAssignment, 
  onRemoveAssignment 
}: TableLayoutPanelProps) {
  

  return (
    <div className="flex-1 bg-white overflow-auto">
      <div className="relative min-h-full p-8" style={{ minWidth: '1000px', minHeight: '700px' }}>
        {/* Room Title */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-brand-navy text-white px-6 py-2 rounded-lg font-semibold">
            Event Floor Plan
          </div>
        </div>

        {/* Room Boundaries */}
        <div className="absolute inset-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/30">
          <div className="absolute top-2 left-4 text-xs font-semibold text-gray-500">
            Room Layout
          </div>
        </div>
        {/* Tables */}
        {tables.map((table) => (
          <TableComponent
            key={table.name}
            table={table}
            assignments={assignments}
            getAttendeeById={(id) => getAttendeeById(id, attendees)}
            priorityNetworkingInfo={priorityNetworkingInfo}
            companiesWithSeatingRequests={companiesWithSeatingRequests}
            allAttendees={attendees}
            isManageMode={isManageMode}
            onSeatAssignment={onSeatAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />
        ))}

        {/* Enhanced Legend */}
        <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg min-w-[220px]">
          <h4 className="text-sm font-semibold text-brand-navy mb-2">Legend</h4>
          <div className="space-y-2 text-xs">
            {/* Attendee Color Coding */}
            <div className="mb-3">
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
            
            <div className="border-t border-gray-200 pt-2">
              <p className="text-xs font-semibold text-brand-navy mb-2">Table Types:</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-brand-navy"></div>
              <span>Round Table</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-4 rounded-lg bg-gray-200 border-2 border-brand-navy"></div>
              <span>Rectangle Table</span>
            </div>
            </div>
            
            <div className="border-t border-gray-200 pt-2">
              <p className="text-xs font-semibold text-brand-navy mb-2">Seat Status:</p>
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
            
            <div className="border-t border-gray-200 pt-2">
            <div className="text-xs text-brand-gray">
              <p><strong>Interaction:</strong></p>
              <p>• Drag attendees to seats</p>
              <p>• Click X to remove assignments</p>
              <p>• Hover seats for attendee details</p>
            </div>
            </div>
          </div>
        </div>

        {/* Table Statistics */}
        <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
          <h4 className="text-sm font-semibold text-brand-navy mb-2">Table Statistics</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between space-x-4">
              <span>Total Tables:</span>
              <span className="font-semibold text-brand-navy">{tables.length}</span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Round Tables:</span>
              <span className="font-semibold text-brand-navy">
                {tables.filter(t => t.shape !== 'rectangle').length}
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Rectangle Tables:</span>
              <span className="font-semibold text-brand-navy">
                {tables.filter(t => t.shape === 'rectangle').length}
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Total Capacity:</span>
              <span className="font-semibold text-brand-navy">
                {tables.reduce((sum, table) => sum + table.capacity, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}