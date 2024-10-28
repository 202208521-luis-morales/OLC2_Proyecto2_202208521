
/*
entrada: 'abc'
salida: [6513249]

'a' -> 97 -> 01100001
'b' -> 98 -> 01100010
= 01100001 01100010

*/

export const stringTo32BitsArray = (str) => {
    const resultado = []
    let elementIndex = 0
    let intRepresentation = 0;
    let shift = 0;

    while (elementIndex < str.length) {
        intRepresentation = intRepresentation | (str.charCodeAt(elementIndex) << shift)
        shift += 8
        if (shift >= 32) {
            resultado.push(intRepresentation)
            intRepresentation = 0
            shift = 0
        }
        elementIndex++
    }

    if (shift > 0) {
        resultado.push(intRepresentation);
    } else {
        resultado.push(0);
    }

    return resultado;
}


export const stringTo1ByteArray = (str) => {
    const resultado = [];
    let elementIndex = 0;

    while (elementIndex < str.length) {
        if (str[elementIndex] === "\\") {
            // Detecta las secuencias de escape
            const nextChar = str[elementIndex + 1];

            switch (nextChar) {
                case "n":
                    resultado.push(10); // Código ASCII de salto de línea (\n)
                    elementIndex++; // Saltar el siguiente carácter ('n')
                    break;
                case "t":
                    resultado.push(9); // Código ASCII de tabulador (\t)
                    elementIndex++; // Saltar el siguiente carácter ('t')
                    break;
                case "\\":
                    resultado.push(92); // Código ASCII de backslash (\)
                    elementIndex++; // Saltar el siguiente carácter ('\')
                    break;
                // Puedes agregar más secuencias de escape aquí si lo necesitas
                default:
                    resultado.push(str.charCodeAt(elementIndex));
            }
        } else {
            // Si no es una barra invertida, simplemente agregar el carácter actual
            resultado.push(str.charCodeAt(elementIndex));
        }

        elementIndex++;
    }

    resultado.push(0); // Añadir terminación nula
    return resultado;
}



export const numberToF32 = (number) => {

    const buffer = new ArrayBuffer(4);
    const float32arr = new Float32Array(buffer);
    const uint32arr = new Uint32Array(buffer);
    float32arr[0] = number;

    const integer = uint32arr[0];
    const hexRepr = integer.toString(16);
    return '0x' + hexRepr;
}