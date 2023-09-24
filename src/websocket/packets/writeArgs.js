const magic = {
    NIL: 0,
    BOOL_TRUE: 1, BOOL_FALSE: 2, 
    DOUBLE: 3,
    STRING: 4,
    TABLE: 5,
    VECTOR_2: 6, VECTOR_3: 7, VECTOR_4: 8,
    MATRIX_2: 9, MATRIX_3: 10, MATRIX_4: 11,
    INT_1B: 12, INT_2B: 13, INT_3B: 14, INT_4B: 15 
}

function doubleToLongBits(bigInt) {
    const data = new ArrayBuffer(8);
    let longView = new Float64Array(data);
    let doubleView = new BigInt64Array(data);

    longView[0] = bigInt
    return doubleView[0]
}
function writeString(dv, pos, value, type) {
    let current = 0
    const str = new TextEncoder().encode(value);
    dv.setInt16(pos, str.length)
    current+=2;
    
    for(let i = 0; i < str.length; i++) {
        dv.setInt8(pos+current, str[i]);
        current += 1;
    }

    return current
}
function writeDouble(dv, pos, value, type) {
    const dg = doubleToLongBits(value);
    dv.setBigInt64(pos,dg);
    return 8
}

function writeInt(dv, pos, value, type) {
    let size = 0;
    
    if(type == magic.INT_1B) {
        dv.setInt8(pos+size, value)
        size += 1
    } else if(type == magic.INT_2B) {
        dv.setInt16(pos+size, value)
        size += 2
    } else if (type == magic.INT_3B) {
        dv.setInt16(pos+size,z>>16)
        size += 2
        dv.setInt8(pos+size,value&0xff)
        size += 1
    } else if (type == magic.INT_4B) {
        dv.setInt32(pos+size,value);
        size += 4
    }
    return size;
}

function writeTable(dv, pos, value, type) {
    let entries = Object.entries(value);
    let size = 0;
    {
        let intType = getType(entries.length);
        dv.setInt8(pos+size, intType);
        size+=1;
        size += writeInt(dv, pos+size, entries.length, intType)
    }
            
    for(let i = 0; i < entries.length; i++) {
        let keyType = getType(entries[i][0]);
        dv.setInt8(pos+size, keyType);
        size += 1;
        size += writeArg(dv, pos+size, entries[i][0], keyType)
        
        let valueType = getType(entries[i][1]);
        dv.setInt8(pos+size, valueType);
        size += 1;
        size += writeArg(dv, pos+size, entries[i][1], valueType)
    }

    return size
}

function writeVec(dv, pos, value, type) {
    let size = type == magic.VECTOR_2 ? 2 : type == magic.VECTOR_3 ? 3 : type == magic.VECTOR_4 ? 4 : -1;
    if(size == -1) return;

    for(let i = 0; i < size; i++) {
        dv.setBigInt64(pos+(i*8), doubleToLongBits(value[i]));
    }
    return 8*size;
}

function writeMat(dv, pos, value, type) {
    let size = type == magic.MATRIX_2 ? 2 : type == magic.MATRIX_3 ? 3 : type == magic.MATRIX_4 ? 4 : -1;
    if(size == -1) return;
    
    let current = 0;
    for(let i = 0; i < size; i++) {
        for(let o = 0; o < size; o++) {
            dv.setBigInt64(pos+current, doubleToLongBits(value[i][o]));
            current+=8;
        }
    }


    return current
}
function writeArg(dv, pos, value, type) {
    if(type == magic.INT_1B || type == magic.INT_2B || type == magic.INT_3B || type == magic.INT_4B) {
        return writeInt(dv, pos, value, type)
    }
    if(type == magic.VECTOR_2 || type == magic.VECTOR_3 || type == magic.VECTOR_4) {
        return writeVec(dv, pos, value, type);
    }
    if(type == magic.MATRIX_2 || type == magic.MATRIX_3 || type == magic.MATRIX_4) {
        return writeMat(dv, pos, value, type);
    }
    if(type == magic.DOUBLE) {
        return writeDouble(dv, pos, value, type)
    }
    if(type == magic.STRING) {
        return writeString(dv, pos, value, type)
    }
    if(type == magic.BOOL_FALSE || type == magic.BOOL_TRUE) {
        return 0
    }
    if(type == magic.TABLE) {
        return writeTable(dv, pos, value, type)
    }
}

function getType(z) {
    let type = -1;

    if(typeof z == "number") {
        if(Number.isInteger(z)) {
            if(Math.pow(-2,7)-1 <= z && z <= Math.pow(2,7)-1) {
                type = magic.INT_1B
            } else if(Math.pow(-2,15)-1 <= z && z <= Math.pow(2,15)-1) {
                type = magic.INT_2B
            } else if (-0x800000 <= z && z < 0x800000) {
                type = magic.INT_3B
            } else if (-2147483647 <= z && z < 2147483647) {
                type = magic.INT_4B
            } else {
                type = magic.DOUBLE
            }
        } else {
            type = magic.DOUBLE
        }
    }

    if(typeof z == "bigint") {
        type = magic.DOUBLE
    }
    
    if(typeof z == "string") {
        type = magic.STRING;
    }
    
    if(typeof z == "boolean") {
        if(z) type = magic.BOOL_TRUE; else 
            type = magic.BOOL_FALSE;
    }
    
    if(typeof z == "object") {
        if(Array.isArray(z)) {
            if(z.every(g=>Number.isInteger(+g))) {
                if(z.length == 2) {
                    type = magic.VECTOR_2
                }
                if(z.length == 3) {
                    type = magic.VECTOR_3
                }
                if(z.length == 4) {
                    type = magic.VECTOR_4
                }
            } else {
                if(z.every(g=>Array.isArray(g)||g.every(b=>Number.isInteger(+b)))) {
                    if(z.length == 2) {
                        type = magic.MATRIX_2
                    }
                    if(z.length == 3) {
                        type = magic.MATRIX_3
                    }
                    if(z.length == 4) {
                        type = magic.MATRIX_4
                    }
                }
            }
        } else {
            type = magic.TABLE
        }
    }
    return type;
}
export function writeArgs(data) {
    let size = 0;
    const i8 = new Int8Array(512*2) // TODO: likely too small and also should not be done like this
    const dv = new DataView(i8.buffer);

    data.forEach(z => {
        let type = getType(z);

        if(type != -1) {
            dv.setInt8(size,type)
            size += 1
            size += writeArg(dv, size, z, type)
        }
    })
    return i8.subarray(0, size);
}
