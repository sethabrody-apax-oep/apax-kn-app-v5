interface AttendeeColorInfo {
  bgColor: string;
  textColor: string;
  borderColor: string;
  isPriorityNetworking?: boolean;
}

export const getAttendeeCategoryColor = (attendee: any, isPriorityNetworking: boolean = false): AttendeeColorInfo => {
  if (!attendee || !attendee.attributes) {
    return { 
      bgColor: 'bg-brand-navy/20', 
      textColor: 'text-brand-navy', 
      borderColor: 'border-brand-navy',
      isPriorityNetworking 
    };
  }

  const attributes = attendee.attributes;
  
  // Base color info
  let colorInfo: AttendeeColorInfo;

  // 1. Yellow: All Vendors (regardless of CEO status)
  if (attributes.sponsorAttendee) {
    colorInfo = { bgColor: 'bg-sector-tech', textColor: 'text-white', borderColor: 'border-sector-tech' };
  }

  // 2. Dark Red: CEOs who are also Portfolio Company executives
  else if (attributes.ceo && attributes.portfolioCompanyExecutive) {
    colorInfo = { bgColor: 'bg-chart-red', textColor: 'text-white', borderColor: 'border-chart-red' };
  }

  // 3. Light Purple: Apax IP personnel
  else if (attributes.apaxIP) {
    colorInfo = { bgColor: 'bg-light-purple', textColor: 'text-white', borderColor: 'border-light-purple' };
  }

  // 4. Dark Purple: Apax EP personnel
  else if (attributes.apaxEP) {
    colorInfo = { bgColor: 'bg-dark-purple', textColor: 'text-white', borderColor: 'border-dark-purple' };
  }

  // 5. Green: Apax OEP personnel
  else if (attributes.apaxOEP) {
    colorInfo = { bgColor: 'bg-chart-green', textColor: 'text-white', borderColor: 'border-chart-green' };
  }

  // 6. Light Blue: All other Portfolio Company executives (non-CEO)
  // This condition should only apply if not already caught by CEO + PCE
  else if (attributes.portfolioCompanyExecutive) {
    colorInfo = { bgColor: 'bg-sector-services', textColor: 'text-white', borderColor: 'border-sector-services' };
  }
  // Default color if none of the above categories match
  else {
    colorInfo = { bgColor: 'bg-brand-navy/20', textColor: 'text-brand-navy', borderColor: 'border-brand-navy' };
  }

  // Add priority networking flag
  return {
    ...colorInfo,
    isPriorityNetworking
  };
};

export const getAttendeeTypeIcon = (attributes: any) => {
  if (!attributes || typeof attributes !== 'object') return 'O';
  
  if (attributes.apaxIP) return 'IP';
  if (attributes.apaxOEP) return 'OEP';
  if (attributes.apaxOther) return 'AO';
  if (attributes.apaxOther) return 'AO';
  if (attributes.sponsorAttendee) return 'V';
  if (attributes.portfolioCompanyExecutive) return 'P';
  if (attributes.speaker) return 'S';
  if (attributes.ceo) return 'C';
  if (attributes.cfo) return 'F';
  if (attributes.cmo) return 'M';
  if (attributes.cro) return 'R';
  if (attributes.coo) return 'O';
  if (attributes.chro) return 'H';
  if (attributes.cto_cio) return 'T';
  if (attributes.cto_cio) return 'T';
  if (attributes.cLevelExec) return 'CL';
  if (attributes.nonCLevelExec) return 'NL';
  if (attributes.cfo) return 'F';
  if (attributes.cmo) return 'M';
  if (attributes.cro) return 'R';
  if (attributes.coo) return 'O';
  if (attributes.chro) return 'H';
  if (attributes.cLevelExec) return 'CL';
  if (attributes.nonCLevelExec) return 'NL';
  
  return 'O';
};

export const getAttendeeFilterCategories = (attendee: any) => {
  if (!attendee || !attendee.attributes) return ['other'];
  
  const attributes = attendee.attributes;
  const categories = [];
  
  // Check if this is a spouse first
  if (attendee.isSpouse || attendee.is_spouse) {
    categories.push('spouse-partner');
  }
  
  // Check each category
  if (attributes.apaxEP || attendee.is_apax_ep) categories.push('apax-ep');
  if (attributes.apaxIP) categories.push('apax-ip');
  if (attributes.apaxOEP) categories.push('apax-oep');
  if (attributes.apaxOther) categories.push('apax-other');
  if (attributes.ceo || (attributes.ceo && attributes.portfolioCompanyExecutive)) categories.push('ceo');
  if (attributes.cfo) categories.push('cfo');
  if (attributes.cmo) categories.push('cmo');
  if (attributes.cro) categories.push('cro');
  if (attributes.coo) categories.push('coo');
  if (attributes.chro) categories.push('chro');
  if (attributes.cLevelExec) categories.push('c-level-exec');
  if (attributes.nonCLevelExec) categories.push('non-c-level-exec');
  if (attributes.portfolioCompanyExecutive) categories.push('portfolio-exec');
  if (attributes.sponsorAttendee) categories.push('vendor');
  if (attributes.speaker) categories.push('speaker');
  
  // If no specific categories, it's "other"
  if (categories.length === 0) categories.push('other');
  
  return categories;
};