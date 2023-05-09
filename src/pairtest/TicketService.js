import InvalidPurchaseException from "./lib/InvalidPurchaseException.js";
import TicketPaymentService from "../thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../thirdparty/seatbooking/SeatReservationService.js";

//Ideally this would be used with here and in the TicketTypeRequest as const
const TicketType = {
  Adult: "ADULT",
  Child: "CHILD",
  Infant: "INFANT",
};

export default class TicketService {
  /**
   * Should only have private methods other than the one below.
   */

  purchaseTickets(accountId, ...ticketTypeRequests) {
    //Assumptions:
    //1. That ticketTypeRequests is an array of TicketTypeRequest objects.
    //    I would favour doing this test in typescript and being explicit about this but the test is javascript
    //2. That the purchase rules outlined in the test apply to all the TicketTypeRequest in the ticketTypeRequests array
    //    as a whole not per request object.

    //create a reservation object that will validate our request and calculate the price and seat count
    var seatReservation = new SeatReservation(accountId, ...ticketTypeRequests);

    //make payment
    var paymentService = new TicketPaymentService();
    paymentService.makePayment(accountId, seatReservation.getPrice());

    //reserve seats
    var reservationService = new SeatReservationService();
    reservationService.reserveSeat(accountId, seatReservation.getSeatCount());

    return seatReservation;
  }
}

class SeatReservation {
  #countByTicketType = new Map();
  #price = 0;
  #seatCount = 0;

  constructor(accountId, ...ticketTypeRequests) {
    if (!Number.isInteger(accountId) || accountId < 1) {
      throw new InvalidPurchaseException("accountId must be an integer greater than 0");
    }

    if (ticketTypeRequests === undefined || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException("Must have at least one TicketTypeRequest");
    }

    const ticketTypeDetails = this.#buildTicketTypeDetails();
    this.#countByTicketType = this.#getCountByTicketType(ticketTypeRequests);

    this.#price = this.#calculatePrice(ticketTypeDetails);
    this.#seatCount = this.#calculateSeatCount(ticketTypeDetails);

    this.#validate();
  }

  getPrice() {
    return this.#price;
  }

  getSeatCount() {
    return this.#seatCount;
  }

  #buildTicketTypeDetails() {
    //create a map of ticket type to price and whether it requires a seat, this could be injection or loaded from config but its static for this example
    const ticketTypeDetails = new Map();
    ticketTypeDetails.set(TicketType.Adult, {
      price: 20,
      requiresSeat: true,
    });
    ticketTypeDetails.set(TicketType.Child, {
      price: 10,
      requiresSeat: true,
    });
    ticketTypeDetails.set(TicketType.Infant, {
      price: 0,
      requiresSeat: false,
    });

    return ticketTypeDetails;
  }

  #getCountByTicketType(ticketTypeRequests) {
    const countByTicketType = ticketTypeRequests.reduce((accumulator, currentValue) => {
      const ticketType = currentValue.getTicketType();
      let currentCountForTicketType = accumulator.get(ticketType);
      if (currentCountForTicketType === undefined) {
        currentCountForTicketType = currentValue.getNoOfTickets();
      } else {
        currentCountForTicketType += currentValue.getNoOfTickets();
      }
      accumulator.set(ticketType, currentCountForTicketType);
      return accumulator;
    }, new Map());

    return countByTicketType;
  }

  #getCount(ticketType) {
    const typeCount = this.#countByTicketType.get(ticketType);
    return typeCount === undefined ? 0 : typeCount;
  }

  #calculateSeatCount(ticketTypeDetails) {
    let seatCount = 0;
    this.#countByTicketType.forEach((count, ticketType) => {
      if (ticketTypeDetails.get(ticketType).requiresSeat) {
        seatCount += count;
      }
    });
    return seatCount;
  }

  #calculatePrice(ticketTypeDetails) {
    let price = 0;
    this.#countByTicketType.forEach((count, ticketType) => {
      price += count * ticketTypeDetails.get(ticketType).price;
    });
    return price;
  }

  #validate() {
    //validate that only 20 tickets can be purchased at a time.  I assume that means per request to
    //the purchaseTickets method not
    if (this.getSeatCount() > 20) {
      throw new InvalidPurchaseException("Only 20 tickets can be purchased at a time");
    }

    //validate that there is at least one adult seat if there are child and infant seats
    if (
      this.#getCount(TicketType.Child) + this.#getCount(TicketType.Infant) > 0 &&
      this.#getCount(TicketType.Adult) < 1
    ) {
      throw new InvalidPurchaseException("There must be at least one adult seat if there are child or infant seats");
    }

    //validate that there are as many infants seats request as there are adults seats requested
    if (this.#getCount(TicketType.Infant) > this.#getCount(TicketType.Adult)) {
      throw new InvalidPurchaseException("There must be as many adult seats as there are infant seats requested");
    }
  }
}
