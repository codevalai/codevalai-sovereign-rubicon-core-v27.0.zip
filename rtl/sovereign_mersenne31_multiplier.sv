// Phase 20: Hardware-Accelerated Mersenne-31 (2^31 - 1) Prime Field Multiplier
// Executes 64-bit reduction and modular multiplication in a single combinatorial clock cycle.
module sovereign_mersenne31_multiplier (
    input  logic [31:0] a,
    input  logic [31:0] b,
    output logic [31:0] result
);
    logic [63:0] product;
    logic [63:0] temp_sum;
    logic [31:0] reduced;

    assign product = {32'h0, a} * {32'h0, b};

    // Mersenne-31 reduction: x mod (2^31 - 1) == (x & 0x7FFFFFFF) + (x >> 31)
    always_comb begin
        temp_sum = (product & 64'h000000007FFFFFFF) + (product >> 31);
        reduced  = {31'h0, temp_sum[31]} + temp_sum[30:0];

        if (reduced >= 32'h7FFFFFFF)
            result = reduced - 32'h7FFFFFFF;
        else
            result = {1'b0, reduced[30:0]};
    end
endmodule
