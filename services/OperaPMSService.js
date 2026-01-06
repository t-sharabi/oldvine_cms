const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

class OperaPMSService {
  constructor() {
    this.baseURL = process.env.OPERA_PMS_URL;
    this.username = process.env.OPERA_PMS_USERNAME;
    this.password = process.env.OPERA_PMS_PASSWORD;
    this.propertyCode = process.env.OPERA_PMS_PROPERTY_CODE;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      auth: {
        username: this.username,
        password: this.password
      },
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      }
    });
  }

  // Generate XML request wrapper
  generateXMLRequest(requestType, data) {
    const builder = new xml2js.Builder({
      rootName: 'OTA_Request',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    const request = {
      '@': {
        'xmlns': 'http://www.opentravel.org/OTA/2003/05',
        'Version': '1.0',
        'TimeStamp': new Date().toISOString(),
        'Target': 'Production'
      },
      'POS': {
        'Source': {
          '@': {
            'ISOCurrency': 'USD',
            'ISOCountry': 'US'
          },
          'RequestorID': {
            '@': {
              'Type': '5',
              'ID': this.propertyCode
            }
          }
        }
      },
      ...data
    };

    return builder.buildObject(request);
  }

  // Parse XML response
  async parseXMLResponse(xmlString) {
    const parser = new xml2js.Parser({ explicitArray: false });
    return parser.parseStringPromise(xmlString);
  }

  // Get room availability from Opera PMS
  async getRoomAvailability(checkIn, checkOut, roomType = null) {
    try {
      const data = {
        'AvailRequestSegments': {
          'AvailRequestSegment': {
            'StayDateRange': {
              '@': {
                'Start': checkIn.toISOString().split('T')[0],
                'End': checkOut.toISOString().split('T')[0]
              }
            },
            'RoomStayCandidates': {
              'RoomStayCandidate': {
                '@': {
                  'Quantity': '1'
                },
                'GuestCounts': {
                  'GuestCount': {
                    '@': {
                      'AgeQualifyingCode': '10',
                      'Count': '1'
                    }
                  }
                }
              }
            },
            'HotelSearchCriteria': {
              'Criterion': {
                'HotelRef': {
                  '@': {
                    'HotelCode': this.propertyCode
                  }
                }
              }
            }
          }
        }
      };

      const xmlRequest = this.generateXMLRequest('OTA_HotelAvailRQ', data);
      
      logger.integrationLog('Sending availability request to Opera PMS', {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        roomType
      });

      const response = await this.client.post('/availability', xmlRequest);
      const parsedResponse = await this.parseXMLResponse(response.data);

      return this.processAvailabilityResponse(parsedResponse);
    } catch (error) {
      logger.error('Opera PMS availability request failed:', {
        error: error.message,
        checkIn,
        checkOut,
        roomType
      });
      throw error;
    }
  }

  // Process availability response
  processAvailabilityResponse(response) {
    try {
      const availabilityData = response.OTA_HotelAvailRS;
      
      if (availabilityData.Errors) {
        throw new Error(`Opera PMS Error: ${availabilityData.Errors.Error.ShortText}`);
      }

      const roomStays = availabilityData.RoomStays?.RoomStay || [];
      const availableRooms = Array.isArray(roomStays) ? roomStays : [roomStays];

      return availableRooms.map(room => ({
        roomTypeCode: room.RoomTypes?.RoomType?.RoomTypeCode,
        roomDescription: room.RoomTypes?.RoomType?.RoomDescription?.Text,
        rateCode: room.RatePlans?.RatePlan?.RatePlanCode,
        baseRate: parseFloat(room.RoomRates?.RoomRate?.Rates?.Rate?.Base?.AmountAfterTax),
        currency: room.RoomRates?.RoomRate?.Rates?.Rate?.Base?.CurrencyCode,
        availability: parseInt(room.RoomTypes?.RoomType?.NumberOfUnits) || 1
      }));
    } catch (error) {
      logger.error('Error processing Opera PMS availability response:', error);
      return [];
    }
  }

  // Create reservation in Opera PMS
  async createReservation(booking) {
    try {
      const data = {
        'HotelReservations': {
          'HotelReservation': {
            '@': {
              'CreateDateTime': new Date().toISOString(),
              'LastModifyDateTime': new Date().toISOString()
            },
            'UniqueID': {
              '@': {
                'Type': '14',
                'ID': booking.bookingNumber
              }
            },
            'RoomStays': {
              'RoomStay': {
                'RoomTypes': {
                  'RoomType': {
                    '@': {
                      'RoomTypeCode': booking.room.operaRoomId || booking.room.type
                    }
                  }
                },
                'RatePlans': {
                  'RatePlan': {
                    '@': {
                      'RatePlanCode': 'RACK'
                    }
                  }
                },
                'RoomRates': {
                  'RoomRate': {
                    'Rates': {
                      'Rate': {
                        '@': {
                          'EffectiveDate': booking.checkInDate.toISOString().split('T')[0],
                          'ExpireDate': booking.checkOutDate.toISOString().split('T')[0]
                        },
                        'Base': {
                          '@': {
                            'AmountAfterTax': booking.roomRate,
                            'CurrencyCode': 'USD'
                          }
                        }
                      }
                    }
                  }
                },
                'GuestCounts': {
                  'GuestCount': {
                    '@': {
                      'AgeQualifyingCode': '10',
                      'Count': booking.numberOfGuests.adults
                    }
                  }
                },
                'TimeSpan': {
                  '@': {
                    'Start': booking.checkInDate.toISOString().split('T')[0],
                    'End': booking.checkOutDate.toISOString().split('T')[0]
                  }
                }
              }
            },
            'ResGuests': {
              'ResGuest': {
                'Profiles': {
                  'ProfileInfo': {
                    'Profile': {
                      'Customer': {
                        'PersonName': {
                          'GivenName': booking.guest.firstName,
                          'Surname': booking.guest.lastName
                        },
                        'Telephone': {
                          '@': {
                            'PhoneNumber': booking.guest.phone
                          }
                        },
                        'Email': {
                          '@': {
                            'EmailType': 'Primary'
                          },
                          '_': booking.guest.email
                        }
                      }
                    }
                  }
                }
              }
            },
            'ResGlobalInfo': {
              'HotelReservationIDs': {
                'HotelReservationID': {
                  '@': {
                    'ResID_Type': '14',
                    'ResID_Value': booking.confirmationCode
                  }
                }
              }
            }
          }
        }
      };

      const xmlRequest = this.generateXMLRequest('OTA_HotelResRQ', data);
      
      logger.integrationLog('Creating reservation in Opera PMS', {
        bookingNumber: booking.bookingNumber,
        confirmationCode: booking.confirmationCode,
        guestEmail: booking.guest.email
      });

      const response = await this.client.post('/reservations', xmlRequest);
      const parsedResponse = await this.parseXMLResponse(response.data);

      return this.processReservationResponse(parsedResponse, booking);
    } catch (error) {
      logger.error('Opera PMS reservation creation failed:', {
        error: error.message,
        bookingNumber: booking.bookingNumber
      });
      throw error;
    }
  }

  // Process reservation response
  processReservationResponse(response, booking) {
    try {
      const reservationData = response.OTA_HotelResRS;
      
      if (reservationData.Errors) {
        throw new Error(`Opera PMS Error: ${reservationData.Errors.Error.ShortText}`);
      }

      const operaConfirmationNumber = reservationData.HotelReservations?.HotelReservation?.UniqueID?.ID;
      
      logger.integrationLog('Opera PMS reservation created successfully', {
        bookingNumber: booking.bookingNumber,
        operaConfirmationNumber
      });

      return {
        success: true,
        operaConfirmationNumber,
        message: 'Reservation created successfully in Opera PMS'
      };
    } catch (error) {
      logger.error('Error processing Opera PMS reservation response:', error);
      throw error;
    }
  }

  // Cancel reservation in Opera PMS
  async cancelReservation(operaConfirmationNumber, reason = 'Guest cancellation') {
    try {
      const data = {
        'HotelReservations': {
          'HotelReservation': {
            'UniqueID': {
              '@': {
                'Type': '14',
                'ID': operaConfirmationNumber
              }
            },
            'ResStatus': {
              '@': {
                'ResStatus': 'Cancelled'
              }
            },
            'CancelPenalties': {
              'CancelPenalty': {
                'PenaltyDescription': {
                  'Text': reason
                }
              }
            }
          }
        }
      };

      const xmlRequest = this.generateXMLRequest('OTA_CancelRQ', data);
      
      logger.integrationLog('Cancelling reservation in Opera PMS', {
        operaConfirmationNumber,
        reason
      });

      const response = await this.client.post('/cancellations', xmlRequest);
      const parsedResponse = await this.parseXMLResponse(response.data);

      return this.processCancellationResponse(parsedResponse);
    } catch (error) {
      logger.error('Opera PMS cancellation failed:', {
        error: error.message,
        operaConfirmationNumber
      });
      throw error;
    }
  }

  // Process cancellation response
  processCancellationResponse(response) {
    try {
      const cancellationData = response.OTA_CancelRS;
      
      if (cancellationData.Errors) {
        throw new Error(`Opera PMS Error: ${cancellationData.Errors.Error.ShortText}`);
      }

      logger.integrationLog('Opera PMS reservation cancelled successfully');

      return {
        success: true,
        message: 'Reservation cancelled successfully in Opera PMS'
      };
    } catch (error) {
      logger.error('Error processing Opera PMS cancellation response:', error);
      throw error;
    }
  }

  // Get guest profile from Opera PMS
  async getGuestProfile(email) {
    try {
      const data = {
        'ProfileReadRequest': {
          'ReadRequests': {
            'ProfileReadRequest': {
              'UniqueID': {
                '@': {
                  'Type': '1',
                  'ID': email
                }
              }
            }
          }
        }
      };

      const xmlRequest = this.generateXMLRequest('OTA_ProfileReadRQ', data);
      const response = await this.client.post('/profiles', xmlRequest);
      const parsedResponse = await this.parseXMLResponse(response.data);

      return this.processProfileResponse(parsedResponse);
    } catch (error) {
      logger.error('Opera PMS profile lookup failed:', {
        error: error.message,
        email
      });
      return null; // Guest profile not found is not an error
    }
  }

  // Process profile response
  processProfileResponse(response) {
    try {
      const profileData = response.OTA_ProfileReadRS;
      
      if (profileData.Errors) {
        return null; // Profile not found
      }

      const profile = profileData.Profiles?.ProfileInfo?.Profile;
      
      return {
        operaGuestId: profile.UniqueID?.ID,
        firstName: profile.Customer?.PersonName?.GivenName,
        lastName: profile.Customer?.PersonName?.Surname,
        email: profile.Customer?.Email?._,
        phone: profile.Customer?.Telephone?.PhoneNumber,
        vipStatus: profile.Customer?.VIP_Indicator === 'true'
      };
    } catch (error) {
      logger.error('Error processing Opera PMS profile response:', error);
      return null;
    }
  }

  // Sync room inventory
  async syncRoomInventory() {
    try {
      logger.integrationLog('Starting room inventory sync with Opera PMS');
      
      // This would typically fetch all room types and their current inventory
      // Implementation depends on specific Opera PMS setup
      
      const data = {
        'InventoryRetrieveRequest': {
          'HotelCode': this.propertyCode,
          'DateRange': {
            'Start': new Date().toISOString().split('T')[0],
            'End': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }
      };

      const xmlRequest = this.generateXMLRequest('OTA_HotelInvCountRQ', data);
      const response = await this.client.post('/inventory', xmlRequest);
      const parsedResponse = await this.parseXMLResponse(response.data);

      return this.processInventoryResponse(parsedResponse);
    } catch (error) {
      logger.error('Opera PMS inventory sync failed:', error);
      throw error;
    }
  }

  // Process inventory response
  processInventoryResponse(response) {
    try {
      const inventoryData = response.OTA_HotelInvCountRS;
      
      if (inventoryData.Errors) {
        throw new Error(`Opera PMS Error: ${inventoryData.Errors.Error.ShortText}`);
      }

      // Process inventory data and return room availability updates
      logger.integrationLog('Opera PMS inventory sync completed successfully');
      
      return {
        success: true,
        message: 'Inventory synchronized successfully'
      };
    } catch (error) {
      logger.error('Error processing Opera PMS inventory response:', error);
      throw error;
    }
  }

  // Health check for Opera PMS connection
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'connected',
        responseTime: response.headers['x-response-time'] || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Opera PMS health check failed:', error);
      return {
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = OperaPMSService;