// Phase 20: RISC-V (rv64gcv_zve32x) Custom Coprocessor Top-Level Bridge
// Wires Mersenne-31 Circle STARK ALU + GF(2^128) Cantor NTT + 1.58-Bit Ternary Popcount ALU.
module sovereign_riscv_zve32x_coprocessor (
    input  logic         clk,
    input  logic         rst_n,
    input  logic [2:0]   opcode,      // 000: M31_MUL, 001: BINIUS_NTT, 010: TERNARY_DOT
    input  logic         req_valid,
    input  logic [127:0] rs1_data,
    input  logic [127:0] rs2_data,
    input  logic [127:0] rs3_twiddle,
    output logic [127:0] rd_data,
    output logic         resp_valid
);
    logic [31:0]  m31_res;
    logic [127:0] binius_u, binius_v;
    logic         binius_valid;
    logic signed [31:0] ternary_acc;

    sovereign_mersenne31_multiplier u_m31 (
        .a(rs1_data[31:0]),
        .b(rs2_data[31:0]),
        .result(m31_res)
    );

    sovereign_binius_cantor_butterfly u_binius (
        .clk(clk),
        .rst_n(rst_n),
        .valid_in(req_valid && (opcode == 3'b001)),
        .u_in(rs1_data),
        .v_in(rs2_data),
        .twiddle_w(rs3_twiddle),
        .u_out(binius_u),
        .v_out(binius_v),
        .valid_out(binius_valid)
    );

    // 1.58-bit Dual-Plane Ternary Popcount ALU: sum(W_pos & X) - sum(W_neg & X)
    always_comb begin
        ternary_acc = 32'sd0;
        for (int b = 0; b < 128; b++) begin
            if (rs1_data[b] & rs3_twiddle[b]) ternary_acc += 32'sd1;
            if (rs2_data[b] & rs3_twiddle[b]) ternary_acc -= 32'sd1;
        end
    end

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            rd_data    <= 128'h0;
            resp_valid <= 1'b0;
        end else begin
            case (opcode)
                3'b000: begin
                    rd_data    <= {96'h0, m31_res};
                    resp_valid <= req_valid;
                end
                3'b001: begin
                    rd_data    <= binius_u ^ binius_v;
                    resp_valid <= binius_valid;
                end
                3'b010: begin
                    rd_data    <= {{96{ternary_acc[31]}}, ternary_acc};
                    resp_valid <= req_valid;
                end
                default: begin
                    rd_data    <= 128'h0;
                    resp_valid <= 1'b0;
                end
            endcase
        end
    end
endmodule
