import React from 'react'
import { X, User, Building } from 'lucide-react'
import { useAttendees, useDiningOptions } from '../../hooks/useSupabaseData'

interface TableViewModalProps {
  optionId: string
  tableName: string
  onClose: () => void
}

export default function TableViewModal({ optionId, tableName, onClose }: TableViewModalProps) {
  const { attendees } = useAttendees()
  const { diningOptions } = useDiningOptions()
  
  // Get actual attendees assigned to this table
  const getTableAttendees = () => {
    const diningOption = diningOptions.find((option: any) => option.id === optionId)
    
    if (!diningOption) return []
    
    // Create multiple possible keys to match against attendee data
    const possibleKeys = [
      diningOption.id,
      diningOption.name.toLowerCase().replace(/\s+/g, '-'),
      diningOption.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    ]
    
    const attendeeList = []
    
    // Add main attendees assigned to this table
    attendees.forEach((attendee: any) => {
      if (!attendee.diningSelections) return
      
      // Check all possible keys to find matching dining selection
      for (const key of possibleKeys) {
        const diningSelection = attendee.diningSelections[key]
        if (diningSelection) {
          // Add main attendee if assigned to this table
          if (diningSelection.attending && diningSelection.tableNumber === tableName) {
            attendeeList.push({
              id: attendee.id,
              name: `${attendee.firstName} ${attendee.lastName}`,
              title: attendee.title,
              company: attendee.company,
              photo: attendee.photo,
              type: 'attendee'
            })
          }
          
          // Add spouse if assigned to this table
          if (attendee.hasSpouse && diningSelection.spouseAttending && diningSelection.spouseTableNumber === tableName) {
            attendeeList.push({
              id: `${attendee.id}-spouse`,
              name: `${attendee.spouseDetails.firstName} ${attendee.spouseDetails.lastName}`,
              title: `Spouse of ${attendee.firstName} ${attendee.lastName}`,
              company: attendee.company,
              photo: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400',
              type: 'spouse'
            })
          }
          break // Found a match, no need to check other keys
        }
      }
    })
    
    return attendeeList
  }

  const tableAttendees = getTableAttendees()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              {tableName} Seating
            </h2>
            <p className="text-brand-gray text-sm">
              Attendees assigned to this table
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {tableAttendees.length > 0 ? (
            <div className="space-y-4">
              {tableAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <img
                    src={attendee.photo}
                    alt={attendee.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-brand-navy">
                      {attendee.name}
                    </h3>
                    {attendee.type === 'spouse' && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-light-purple/20 text-purple-800 mb-1">
                        Spouse/Partner
                      </span>
                    )}
                    <p className="text-brand-gray text-sm">
                      {attendee.title}
                    </p>
                    <div className="flex items-center text-brand-gray text-sm mt-1">
                      <Building className="w-3 h-3 mr-1" />
                      <span>{attendee.company}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-brand-gray mx-auto mb-4" />
              <p className="text-brand-gray">
                No attendees assigned to this table yet.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-gray">Total Attendees:</span>
              <span className="font-semibold text-brand-navy">
                {tableAttendees.length}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}