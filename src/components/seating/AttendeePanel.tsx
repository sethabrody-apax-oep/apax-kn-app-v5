import React, { useState } from 'react'
import { Search, Filter, User, Ban, Star } from 'lucide-react'
import AttendeeCard from './AttendeeCard'
import { getAttendeeFilterCategories } from '../../utils/seatingColors'
import { getPriorityNetworkingInfo } from '../../utils/seatingUtils'

interface AttendeePanelProps {
  attendees: any[]
 allEligibleAttendees: any[]
 priorityNetworkingInfo?: Map<string, any>
 companiesWithSeatingRequests?: any[]
  onAttendeeSelect: (attendee: any) => void
}

export default function AttendeePanel({ 
  attendees, 
 allEligibleAttendees,
 priorityNetworkingInfo = new Map(),
 companiesWithSeatingRequests = [],
  onAttendeeSelect
}: AttendeePanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [attributeFilter, setAttributeFilter] = useState('all')

  const filteredAttendees = attendees.filter(attendee => {
    const matchesSearch = `${attendee.firstName || attendee.first_name} ${attendee.lastName || attendee.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      attendee.company.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = attributeFilter === 'all' || 
      getAttendeeFilterCategories(attendee).includes(attributeFilter)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-brand-navy mb-3">
          Unseated Attendees ({filteredAttendees.length})
        </h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-brand-gray" />
          <select
            value={attributeFilter}
            onChange={(e) => setAttributeFilter(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
          >
            <option value="all">All Attendees</option>
            <option value="apax-ep">Apax EP</option>
            <option value="apax-ip">Apax IP</option>
            <option value="apax-oep">Apax OEP</option>
            <option value="apax-other">Apax Other</option>
            <option value="ceo">CEOs</option>
            <option value="cfo">CFOs</option>
            <option value="cmo">CMOs</option>
            <option value="cro">CROs</option>
            <option value="coo">COOs</option>
            <option value="chro">CHROs</option>
            <option value="c-level-exec">Other C-Level</option>
            <option value="non-c-level-exec">Non C-Level</option>
            <option value="portfolio-exec">Portfolio Executives</option>
            <option value="vendor">Vendor</option>
            <option value="speaker">Speakers</option>
            <option value="spouse-partner">Spouses & Partners</option>
            <option value="other">Other Attendees</option>
          </select>
        </div>
      </div>

      {/* Attendee List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredAttendees.length > 0 ? (
          filteredAttendees.map((attendee) => {
            const priorityInfo = priorityNetworkingInfo.get(attendee.id)
            const isPriorityNetworking = priorityInfo?.isPriorityNetworking || false
            const companySeatingNotes = priorityInfo?.seatingNotes || ''
            
            return (
            <AttendeeCard
              key={attendee.id}
              isPriorityNetworking={isPriorityNetworking}
              companySeatingNotes={companySeatingNotes}
             priorityNetworkingInfo={priorityInfo}
             companiesWithSeatingRequests={companiesWithSeatingRequests}
             allEligibleAttendees={allEligibleAttendees}
              attendee={attendee}
              onClick={() => console.log('Attendee clicked:', attendee)}
            />
            )
          })
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-brand-gray">
              {searchTerm || attributeFilter !== 'all' 
                ? 'No attendees match your filters'
                : 'All attendees have been seated'
              }
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="text-sm text-brand-gray">
          <span className="font-semibold text-brand-navy">{filteredAttendees.length}</span> attendees shown
          {priorityNetworkingInfo.size > 0 && (
            <div className="text-xs text-yellow-700 mt-1">
              <Star className="w-3 h-3 inline mr-1" />
              {Array.from(priorityNetworkingInfo.values()).filter(info => info.isPriorityNetworking).length} priority networking
            </div>
          )}
        </div>
      </div>
    </div>
  )
}