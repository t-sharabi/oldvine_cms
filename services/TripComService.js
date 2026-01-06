"use strict";

class TripComService {
  async healthCheck() {
    return {
      status: 'connected',
      service: 'Trip.com',
      timestamp: new Date().toISOString()
    };
  }

  async updateRates(roomType, rates, dates) {
    return { status: 'ok', roomType, dates };
  }

  async updateAvailability(roomType, availability, dates) {
    return { status: 'ok', roomType, dates };
  }

  async getBookings(start, end) {
    return [];
  }

  async getPerformanceData(start, end) {
    return {
      start,
      end,
      totals: {
        bookings: 0,
        revenue: 0,
        cancellations: 0
      }
    };
  }
}

module.exports = TripComService;


