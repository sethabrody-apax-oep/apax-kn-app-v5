export const getAttendeeById = (attendeeId: string, attendees: any[]) => {
  // Find the attendee in the main attendees list
  const attendee = attendees.find(a => a.id === attendeeId)
  return attendee || null
}