// The shapes of the Firestore documents, as the dashboard uses them.
// They match the Flutter models (lib/features/.../data/*.dart).

export type BookingStatus = "confirmed" | "cancelled";

/** bookings/{id} */
export type Booking = {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string; // Copied from the service when the booking was made.
  startAt: Date; // Local time.
  durationMinutes: number;
  status: BookingStatus;
};

/** services/{id} */
export type Service = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean; // Inactive services are hidden from customers.
};

/** The fields an admin can edit on a service. */
export type ServiceInput = Omit<Service, "id">;

/** users/{uid} */
export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: string; // "customer" or "admin"
};
