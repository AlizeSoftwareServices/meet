import MockAdapter from 'axios-mock-adapter';
import { api } from './api';

let mockBookings = [
  { id: 'b1', guestName: 'Sarah Smith', guestEmail: 'sarah@company.com', startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 86400000 + 30 * 60000).toISOString(), status: 'UPCOMING', eventType: { title: '30 Min Strategy Call' }, notes: 'Looking forward to it!' },
  { id: 'b2', guestName: 'Michael Chen', guestEmail: 'michael@startup.io', startTime: new Date(Date.now() + 172800000).toISOString(), endTime: new Date(Date.now() + 172800000 + 30 * 60000).toISOString(), status: 'UPCOMING', eventType: { title: '15 Min Consultation' } },
  { id: 'google-evt-1', guestName: 'Google Calendar Sync', guestEmail: 'alex.j@example.com', startTime: new Date(Date.now() + 43200000).toISOString(), endTime: new Date(Date.now() + 43200000 + 45 * 60000).toISOString(), status: 'UPCOMING', eventType: { title: 'Google Calendar (Synced)' }, notes: 'Personal appointment synced from Google Calendar', isExternal: true, provider: 'google', meetingUrl: 'https://meet.google.com/xyz-demo-app' },
  { id: 'b3', guestName: 'Emma Watson', guestEmail: 'emma@agency.com', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date(Date.now() - 86400000 + 60 * 60000).toISOString(), status: 'PAST', eventType: { title: '60 Min Review' } }
];

export function setupMockApi() {
  if (typeof window !== 'undefined' && localStorage.getItem('demoMode') === 'true') {
    const mock = new MockAdapter(api, { delayResponse: 50 }); // reduced delay for snappy demo

    mock.onGet('/users/me').reply(200, {
      id: 'demo-user',
      name: 'Alex Johnson',
      email: 'alex.j@example.com',
      username: 'alex',
      avatarUrl: 'https://i.pravatar.cc/150?u=alex',
      theme: 'system'
    });

    mock.onGet('/profile').reply(200, {
      id: 'demo-user',
      name: 'Alex Johnson',
      email: 'alex.j@example.com',
      username: 'alex',
      bio: 'Product Designer and Frontend Developer.',
      timezone: 'America/New_York',
      language: 'en',
      company: 'MeetSync',
      website: 'https://meetsync.com'
    });

    mock.onPut('/profile').reply(200, { success: true });

    mock.onGet(/\/public\/users\/.+/).reply(200, {
      id: 'demo-user',
      name: 'Alex Johnson',
      username: 'alex',
      eventTypes: [
        { id: '1', title: 'Discovery Call', duration: 15, location: 'Google Meet', slug: '15min', isActive: true, color: '#00a2ff', type: 'ONE_ON_ONE' },
        { id: '2', title: 'Sales Team Demo', duration: 45, location: 'Zoom', slug: 'sales-demo', isActive: true, color: '#ffb300', type: 'ROUND_ROBIN' },
        { id: '3', title: 'Technical Interview', duration: 60, location: 'Microsoft Teams', slug: 'tech-interview', isActive: true, color: '#ff0055', type: 'COLLECTIVE' }
      ]
    });

    mock.onGet('/event-types').reply(200, [
      { id: '1', title: 'Discovery Call', duration: 15, location: 'Google Meet', slug: '15min', isActive: true, color: '#00a2ff', type: 'ONE_ON_ONE', typeLabel: 'One-on-one', typeDescription: '1 host, 1 invitee', description: 'Quick introductory call to understand your needs.' },
      { id: '2', title: 'Sales Team Demo', duration: 45, location: 'Zoom', slug: 'sales-demo', isActive: true, color: '#ffb300', type: 'ROUND_ROBIN', typeLabel: 'Round robin', typeDescription: 'Rotating hosts, 1 invitee', description: 'Distribute meetings between team members.' },
      { id: '3', title: 'Technical Interview', duration: 60, location: 'Microsoft Teams', slug: 'tech-interview', isActive: true, color: '#ff0055', type: 'COLLECTIVE', typeLabel: 'Collective', typeDescription: 'Multiple hosts, 1 invitee', description: 'Panel interviews.' },
      { id: '4', title: 'Weekly Webinar', duration: 60, location: 'Zoom', slug: 'webinar', isActive: false, color: '#00cc66', type: 'GROUP', typeLabel: 'Group', typeDescription: '1 host, Multiple invitees', description: 'Online classes, etc.' }
    ]);

    mock.onGet('/polls').reply(200, [
      { id: 'p1', title: 'Q3 Planning Session', status: 'Active', votes: 4, url: 'meet.com/poll/q3' }
    ]);

    mock.onGet('/single-use-links').reply(200, []);

    mock.onPost('/event-types').reply(201, { success: true });
    mock.onPatch(/\/event-types\/\d+/).reply(200, { success: true });
    mock.onDelete(/\/event-types\/\d+/).reply(200, { success: true });

    mock.onGet('/bookings/host').reply(() => {
        return [200, mockBookings];
    });

    mock.onGet(/\/public\/availability\/.*\/slots/).reply((config) => {
      const urlParams = new URLSearchParams(config.url?.split('?')[1]);
      const dateStr = urlParams.get('date');
      
      if (!dateStr) return [200, []];
      
      const requestedDate = new Date(dateStr);
      const dayOfWeek = requestedDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) return [200, []];
      
      const slots = [];
      const startHour = 9;
      const endHour = 17;
      
      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slotStart = new Date(requestedDate);
          slotStart.setHours(h, m, 0, 0);
          
          const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
          
          const isConflict = mockBookings.some(booking => {
            const bStart = new Date(booking.startTime).getTime();
            const bEnd = new Date(booking.endTime).getTime();
            const sStart = slotStart.getTime();
            const sEnd = slotEnd.getTime();
            return (sStart < bEnd && sEnd > bStart);
          });
          
          if (!isConflict) {
            slots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString()
            });
          }
        }
      }
      return [200, slots];
    });

    mock.onPost('/public/bookings').reply((config) => {
      const payload = JSON.parse(config.data);
      const reqStart = new Date(payload.startTime).getTime();
      const reqEnd = new Date(payload.endTime).getTime();
      
      const isConflict = mockBookings.some(booking => {
        const bStart = new Date(booking.startTime).getTime();
        const bEnd = new Date(booking.endTime).getTime();
        return (reqStart < bEnd && reqEnd > bStart);
      });
      
      if (isConflict) {
        return [400, { message: 'We are sorry, but this time slot has just been booked by someone else. Please choose another time.' }];
      }
      
      let meetingProvider = 'Google Meet';
      let meetingLink = `https://meet.google.com/abc-${Math.random().toString(36).substring(2, 6)}-xyz`;
      
      if (payload.eventTypeId === '2') {
        meetingProvider = 'Zoom';
        meetingLink = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
      } else if (payload.eventTypeId === '3') {
        meetingProvider = 'Microsoft Teams';
        meetingLink = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${Math.random().toString(36).substring(2, 12)}`;
      }
      
      const newBooking = {
        id: `b${Date.now()}`,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: 'UPCOMING',
        eventType: { title: 'New Meeting' },
        notes: payload.guestNotes,
        meetingLink,
        meetingProvider
      };
      
      mockBookings.push(newBooking);
      
      return [201, { success: true, booking: newBooking }];
    });

    mock.onGet('/analytics/dashboard').reply(200, {
      stats: [
        { title: 'Total Bookings', value: '42' },
        { title: 'Upcoming Meets', value: '12' },
        { title: 'Completed Meets', value: '148' },
        { title: 'Total Contacts', value: '86' },
      ],
      chartData: [
        { name: 'Mon', bookings: 4 },
        { name: 'Tue', bookings: 7 },
        { name: 'Wed', bookings: 2 },
        { name: 'Thu', bookings: 9 },
        { name: 'Fri', bookings: 5 },
        { name: 'Sat', bookings: 0 },
        { name: 'Sun', bookings: 1 },
      ],
      popularEvents: [
        { name: '15 Min Consultation', value: 65 },
        { name: '30 Min Strategy Call', value: 35 },
      ]
    });

    mock.onGet('/integrations').reply(() => {
      const saved = localStorage.getItem('demo_integrations');
      if (saved) return [200, JSON.parse(saved)];
      const defaults = [
        { id: 'int1', provider: 'google', connectedAt: new Date().toISOString() },
        { id: 'int2', provider: 'slack', connectedAt: new Date().toISOString() }
      ];
      return [200, defaults];
    });

    ['google', 'microsoft', 'slack'].forEach(provider => {
      mock.onGet(`/integrations/${provider}/auth`).reply(() => {
        const saved = localStorage.getItem('demo_integrations');
        const list = saved ? JSON.parse(saved) : [
          { id: 'int1', provider: 'google', connectedAt: new Date().toISOString() },
          { id: 'int2', provider: 'slack', connectedAt: new Date().toISOString() }
        ];
        if (!list.some((i: any) => i.provider === provider)) {
          list.push({ id: `int_${provider}`, provider, connectedAt: new Date().toISOString() });
          localStorage.setItem('demo_integrations', JSON.stringify(list));
        }
        return [200, { url: `/dashboard/integrations?success=${provider}_connected` }];
      });
    });

    mock.onGet('/availability').reply(200, {
      timezone: 'America/New_York',
      schedule: [
        { day: 'MONDAY', startTime: '09:00', endTime: '17:00', isActive: true },
        { day: 'TUESDAY', startTime: '09:00', endTime: '17:00', isActive: true },
        { day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', isActive: true },
        { day: 'THURSDAY', startTime: '09:00', endTime: '17:00', isActive: true },
        { day: 'FRIDAY', startTime: '09:00', endTime: '16:00', isActive: true },
        { day: 'SATURDAY', startTime: '09:00', endTime: '17:00', isActive: false },
        { day: 'SUNDAY', startTime: '09:00', endTime: '17:00', isActive: false },
      ]
    });

    mock.onGet('/contacts').reply(200, [
      { id: 'c1', name: 'Sarah Smith', email: 'sarah@company.com', phone: '+1 234 567 8900', totalMeetings: 3, lastMeetingDate: new Date(Date.now() - 86400000).toISOString() },
      { id: 'c2', name: 'Michael Chen', email: 'michael@startup.io', phone: '+1 987 654 3210', totalMeetings: 1, lastMeetingDate: new Date(Date.now() - 172800000).toISOString() }
    ]);

    mock.onAny().reply(404, { message: 'Not Found in Demo Mode' });
    console.log('🧪 Demo Mode Mock API Activated');
  }
}
