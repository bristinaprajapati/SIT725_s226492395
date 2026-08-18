const expect = require("chai").expect;
const request = require("request");

// CALCULATION FUNCTION
function add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        return null;
    }
    return a + b;
}

describe("Calculation Functions", function () {
    it("add() should correctly add two numbers", function () {
        const result = add(2, 3);
        expect(result).to.equal(5);
    });
});

// REST API ENDPOINT TESTS
describe("Sum Calculator API", function () {
    const baseUrl = "http://localhost:3000";

    it("returns status 200 to check if api works", function (done) {
        request(baseUrl, function (error, response, body) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    it("should return correct sum for valid numbers", function (done) {
        request.get(`${baseUrl}/add?a=10&b=5`, function (error, response, body) {
            expect(response.statusCode).to.equal(200);
            expect(body).to.include("15"); // Response contains the sum in text
            done();
        });
    });

    it("should handle missing parameters", function (done) {
        request.get(`${baseUrl}/add?a=10`, function (error, response, body) {
            expect(response.statusCode).to.not.equal(200); // Expect error
            done();
        });
    });

    it("should return error for non-numeric input", function (done) {
        request.get(`${baseUrl}/add?a=hello&b=world`, function (error, response, body) {
            expect(response.statusCode).to.not.equal(200);
            done();
        });
    });
});