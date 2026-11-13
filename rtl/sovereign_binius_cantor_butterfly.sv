// Phase 20: Synthesizable GF(2^128) Binary-Tower Additive Cantor NTT Butterfly
// Zero-carry XOR/CLMUL arithmetic unit for Binius polynomial commitments.
module sovereign_binius_cantor_butterfly (
    input  logic         clk,
    input  logic         rst_n,
    input  logic         valid_in,
    input  logic [127:0] u_in,
    input  logic [127:0] v_in,
    input  logic [127:0] twiddle_w,
    output logic [127:0] u_out,
    output logic [127:0] v_out,
    output logic         valid_out
);
    logic [127:0] clmul_res;

    // Carryless multiplication step mod binary-tower irreducible P_128(x)
    always_comb begin
        logic [255:0] prod;
        prod = 256'h0;
        for (int i = 0; i < 128; i++) begin
            if (twiddle_w[i]) begin
                prod ^= ({128'h0, v_in} << i);
            end
        end
        // Fold upper 128 bits with x^128 + x^7 + x^2 + x + 1
        clmul_res = prod[127:0] ^ prod[255:128] ^ (prod[255:128] << 1) ^ (prod[255:128] << 2) ^ (prod[255:128] << 7);
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            u_out     <= 128'h0;
            v_out     <= 128'h0;
            valid_out <= 1'b0;
        end else begin
            u_out     <= u_in ^ clmul_res;
            v_out     <= u_in ^ clmul_res ^ v_in;
            valid_out <= valid_in;
        end
    end
endmodule
