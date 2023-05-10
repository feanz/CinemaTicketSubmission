import { createRequire } from "module";
const require = createRequire(import.meta.url);
var assert = require("assert");

import TicketService from "../src/pairtest/TicketService.js";
import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest.js";

describe("TicketService", function () {
  const ticketService = new TicketService();
  describe("purchaseTickets()", function () {
    it("should throw when account number is less than 1", function () {
      assert.throws(() => {
        ticketService.purchaseTickets(0);
      }, /accountId must be an integer greater than 0/);
    });
    it("should throw when there are zero TicketTypeRequests", function () {
      assert.throws(() => {
        ticketService.purchaseTickets(1);
      }, /Must have at least one TicketTypeRequest/);
    });
    it("should throw there are more than 20 tickets in total", function () {
      assert.throws(() => {
        ticketService.purchaseTickets(1, new TicketTypeRequest("ADULT", 11), new TicketTypeRequest("CHILD", 10));
      }, /Only 20 tickets can be purchased at a time/);
    });
    it("should throw if there are no adults accompanying any children or infants", function () {
      assert.throws(() => {
        ticketService.purchaseTickets(1, new TicketTypeRequest("INFANT", 2), new TicketTypeRequest("CHILD", 1));
      }, /There must be at least one adult seat if there are child or infant seats/);
    });
    it("should throw if there are more infants than adults", function () {
      assert.throws(() => {
        ticketService.purchaseTickets(1, new TicketTypeRequest("INFANT", 2), new TicketTypeRequest("ADULT", 1));
      }, /There must be as many adult seats as there are infant seats requested/);
    });

    const priceTheories = [
      [10, 5, 2, 250],
      [5, 5, 2, 150],
      [2, 2, 0, 60],
    ];

    priceTheories.forEach(([adult, child, infant, expected]) => {
      it(`should calculate the correct price for ${adult}:adult, ${child}:child, ${infant}:infant tickets`, function () {
        const result = ticketService.purchaseTickets(
          1,
          new TicketTypeRequest("ADULT", adult),
          new TicketTypeRequest("CHILD", child),
          new TicketTypeRequest("INFANT", infant)
        );
        assert.equal(result.getPrice(), expected);
      });
    });

    const seatTheories = [
      [10, 5, 2, 15],
      [5, 5, 2, 10],
      [2, 2, 0, 4],
    ];

    seatTheories.forEach(([adult, child, infant, expected]) => {
      it(`should calculate the correct number of seats for ${adult}:adult, ${child}:child, ${infant}:infant tickets`, function () {
        const result = ticketService.purchaseTickets(
          1,
          new TicketTypeRequest("ADULT", adult),
          new TicketTypeRequest("CHILD", child),
          new TicketTypeRequest("INFANT", infant)
        );
        assert.equal(result.getSeatCount(), expected);
      });
    });
  });
});
