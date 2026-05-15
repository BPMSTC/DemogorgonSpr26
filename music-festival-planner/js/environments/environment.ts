export const environment = {
  production: false,
  // URL of the local Express backend.  Start the backend with `npm run dev`
  // inside music-festival-planner/backend/ before serving the Angular app.
  apiUrl: 'http://localhost:3000',
  calendarAuthEndpoint: '/api/calendar/auth',
  calendarDeviceStorageKey: 'mfp_calendar_device_user_id',
};
