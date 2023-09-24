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

function readInt(dv, pos, type) {
    switch(type) {
        case magic.INT_1B:
            return [dv.getInt8(pos), 1];
        case magic.INT_2B:
            return [dv.getInt16(pos), 2];
        case magic.INT_3B:
            return [dv.getInt16(pos) << 8 | dv.getInt8(pos+1) & 0xFF, 3];
        case magic.INT_4B:
            return [dv.getInt32(pos), 4];
        default:
            throw new Error("Invalid Int type " + type)
    }
}
function readMat(dv, pos, type) {
    let size = type == magic.MATRIX_2 ? 2 : type == magic.MATRIX_3 ? 3 : type == magic.MATRIX_4 ? 4 : -1;
    if(size == -1) return;
    
    let current = 0;

    const vectors = [];
    for(let i = 0; i < size; i++) {
        const array = new Array(size);
        for(let o = 0; o < size; o++) {
            array[o] = longBitsToDouble(dv.getBigInt64(pos+current))
            current += 8;
        }
        vectors[i] = array;
    }
    return [vectors, current]
} 

function longBitsToDouble(bigInt) {
    const data = new ArrayBuffer(8);
    let longView = new BigInt64Array(data);
    let doubleView = new Float64Array(data);

    longView[0] = bigInt
    return doubleView[0]
}

function readVec(dv, pos, type) {
    let size = type == magic.VECTOR_2 ? 2 : type == magic.VECTOR_3 ? 3 : type == magic.VECTOR_4 ? 4 : -1;
    if(size == -1) return;
    const array = []

    for(let i = 0; i < size; i++) {
        array[i] = longBitsToDouble(dv.getBigInt64(pos+(i*8)))
    }
    return [array, 8*size];
}
function readArg(dv, pos, type) {

    if(type == magic.BOOL_TRUE) return [true, 0];
    if(type == magic.BOOL_FALSE) return [false, 0];

    if(type == magic.INT_1B || type == magic.INT_2B || type == magic.INT_3B || type == magic.INT_4B)
        return readInt(dv, pos, type)

    if(type == magic.VECTOR_2 || type == magic.VECTOR_3 || type == magic.VECTOR_4)
        return readVec(dv, pos, type)

    if(type == magic.MATRIX_2 || type == magic.MATRIX_3 || type == magic.MATRIX_4)
        return readMat(dv, pos, type)
    
    if(type == magic.DOUBLE)
        return [longBitsToDouble(dv.getBigInt64(pos)), 8]
    
    if(type == magic.STRING) {
        const size = dv.getUint16(pos);

        let string = new Uint8Array(size)
        for(let i = 0; i < size; i++) {
            string[i] = dv.getInt8(pos+2+i);
        }
        return [new TextDecoder().decode(string), size+2]
    }

    if(type == magic.TABLE) {
        let current = 0;
        let table = {}

        let sizeType = dv.getInt8(pos+current);
        current += 1;
        let [size, sizeSize] = readInt(dv, pos+current, sizeType);
        current += sizeSize;
                
        for(let i = 0; i < size; i++) {
            let keyType = dv.getInt8(pos+current);
            current += 1;
            let [key, keySize] = readArg(dv, pos+current, keyType);
            current += keySize;
            
            let valueType = dv.getInt8(pos+current);
            current += 1;
            let [value, valueSize] = readArg(dv, pos+current, valueType);
            current += valueSize;
            
            table[key] = value
        }

        return [table, current]
    }
    if(type == magic.NIL) return [-1, -1]
    return [-1, -1]
}

export function parseArgs(data) {
    const dv = new DataView(data.buffer);
    let pos = 0; 
    let curr = 1;
    let obj = []

    while(pos < data.length) {
        const type = dv.getInt8(pos);
        pos++;
        
        let [elem, size] = readArg(dv, pos, type);

        if(elem != -1) { 
            obj.push(elem);
            pos += size;
            curr++;
            
        }
    }
    return obj;
}
