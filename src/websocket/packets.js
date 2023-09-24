export function uuidSigBitsToStr(msb, lsb) {
    return `${digits(msb >> 32n, 8n)}-${digits(msb >> 16n, 4n)}-${digits(
        msb,
        4n
    )}-${digits(lsb >> 48n, 4n)}-${digits(lsb, 12n)}`;
}

function digits(val, ds) {
    const hi = 1n << (ds * 4n);
    return (hi | (val & (hi - 1n))).toString(16).substring(1);
}

export function uuidStrToSigBits(uuid) {
    const invalidError = () => new Error(`Invalid UUID string: '${uuid}'`);
    if (uuid == null || typeof uuid !== "string") throw invalidError();
  
    const parts = uuid.split("-").map((p) => `0x${p}`);
    if (parts.length !== 5) throw invalidError();
  
    return {
      lsb: (hexStrToBigInt(parts[3]) << 48n) | hexStrToBigInt(parts[4]),
      msb:
        (hexStrToBigInt(parts[0]) << 32n) |
        (hexStrToBigInt(parts[1]) << 16n) |
        hexStrToBigInt(parts[2]),
    };
  }
  
  function hexStrToBigInt(hex) {
    return BigInt(Number.parseInt(hex, 16));
  }