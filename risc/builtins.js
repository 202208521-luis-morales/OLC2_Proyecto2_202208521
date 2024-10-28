import { registers as r, floatRegisters as fRegs, floatRegisters } from "./constantes.js"
import { Generador } from "./generador.js"

/**
 * @param {Generador} code
 */
export const concatString = (code) => {
    // A0 -> dirección en heap de la primera cadena
    // A1 -> dirección en heap de la segunda cadena
    // result -> push en el stack la dirección en heap de la cadena concatenada

    code.comment('Guardando en el stack la dirección en heap de la cadena concatenada')
    code.push(r.HP);

    code.comment('Copiando la 1er cadena en el heap')
    const end1 = code.getLabel()
    const loop1 = code.addLabel()

    code.lb(r.T1, r.A0)
    code.beq(r.T1, r.ZERO, end1)
    code.sb(r.T1, r.HP)
    code.addi(r.HP, r.HP, 1)
    code.addi(r.A0, r.A0, 1)
    code.j(loop1)
    code.addLabel(end1)

    code.comment('Copiando la 2da cadena en el heap')
    const end2 = code.getLabel()
    const loop2 = code.addLabel()

    code.lb(r.T1, r.A1)
    code.beq(r.T1, r.ZERO, end2)
    code.sb(r.T1, r.HP)
    code.addi(r.HP, r.HP, 1)
    code.addi(r.A1, r.A1, 1)
    code.j(loop2)
    code.addLabel(end2)

    code.comment('Agregando el caracter nulo al final')
    code.sb(r.ZERO, r.HP)
    code.addi(r.HP, r.HP, 1)
}

/**
 * @param {Generador} code
 */
export const parseFloatToInt = (code) => {
    /*
      Función floatToInt
      Espera encontrar el float en el stack
      Devuelve el entero en t0
    */
    
    code.comment("Cargar el float del stack a un registro flotante");
    code.flw(floatRegisters.FA0, r.SP, 0);
    code.addi(r.SP, r.SP, 4);
    code.comment("Convertir float a entero");
    code.fcvtws(r.T0, floatRegisters.FA0, "rtz");
    code.push(r.T0)
}

/**
 * @param {Generador} code
 */
export const parseStringToFloat = (code) => {
    /*
        Función parseStringToFloat
        Input: dirección del string en el stack
        Output: 
       - en el stack: el float (si éxito)
       - en a0: 0 si éxito, 1 si error
    */

    code.comment("Guardar ra");
    code.push(r.RA);
    code.comment("Cargar dirección del string");
    code.comment("string está en stack+4 porque guardamos ra");
    code.lw(r.T0, r.SP, 4);
    
    code.comment("Inicializar registros");
    code.comment("valor entero antes del punto");
    code.li(r.T1, 0);
    code.comment("valor decimal después del punto");
    code.li(r.T2, 0);
    code.comment("divisor para parte decimal");
    code.li(r.T3, 1); 
    code.comment("flag para punto decimal encontrado");
    code.li(r.T4, 0); 
    
    code.addLabel("parseStringToFloat_parse_loop");
    code.comment("cargar carácter");
    code.lb(r.T5, r.T0, 0);
    code.comment("si es null terminator, terminar");
    code.beqz(r.T5, "parseStringToFloat_end_parse");
    code.comment("Verificar si es punto decimal");
    code.comment("'.'");
    code.li(r.S1, 46);
    code.beq(r.T5, r.S1, "parseStringToFloat_found_decimal");
    code.comment("Verificar si es dígito (entre '0' y '9')");
    code.comment("'0'");
    code.li(r.S1, 48);
    code.blt(r.T5, r.S1, "parseStringToFloat_parse_error");
    code.comment("'9'");
    code.li(r.S1, 57);
    code.bgt(r.T5, r.S1, "parseStringToFloat_parse_error");
    code.comment("Convertir ASCII a número");
    code.addi(r.T5, r.T5, -48);
    code.comment("Si ya encontramos punto decimal");
    code.bnez(r.T4, "parseStringToFloat_process_decimal");
    code.comment("Procesar parte entera");
    code.li(r.S1, 10);
    code.mul(r.T1, r.T1, r.S1);
    code.add(r.T1, r.T1, r.T5);
    code.j("parseStringToFloat_next_char");
    
    code.addLabel("parseStringToFloat_process_decimal");
    code.li(r.S1, 10);
    code.comment("multiplicar dígito por divisor actual");
    code.mul(r.T2, r.T2, r.S1);
    code.comment("añadir nuevo dígito");
    code.add(r.T2, r.T2, r.T5);
    code.comment("multiplicar divisor por 10");
    code.mul(r.T3, r.T3, r.S1);
        
    code.addLabel("parseStringToFloat_next_char");
    code.addi(r.T0, r.T0, 1);
    code.j("parseStringToFloat_parse_loop");
        
    code.addLabel("parseStringToFloat_found_decimal");
    code.comment("activar flag de punto decimal");
    code.li(r.T4, 1);
    code.addi(r.T0, r.T0, 1);
    code.j("parseStringToFloat_parse_loop");
        
    code.addLabel("parseStringToFloat_parse_error");
    code.la(r.A0, "error_msg");
    code.li(r.A7, 4);
    code.ecall();
    code.li(r.A7, 10);
    code.ecall(); 
        
    code.addLabel("parseStringToFloat_end_parse");
    code.comment("Convertir a float");
    code.comment("convertir parte entera");
    code.fcvtsw(floatRegisters.FT0, r.T1);
    code.comment("convertir parte decimal"); 
    code.fcvtsw(floatRegisters.FT1, r.T2);
    code.comment("convertir divisor");
    code.fcvtsw(floatRegisters.FT2, r.T3);
    code.comment("dividir parte decimal por divisor");
    code.fdiv(floatRegisters.FT1, floatRegisters.FT1, floatRegisters.FT2);
    code.comment("sumar parte entera y decimal");
    code.fadd(floatRegisters.FT0, floatRegisters.FT0, floatRegisters.FT1);
    code.comment("Guardar resultado en el stack (reemplazando el string original)");
    code.comment("restaurar ra");
    code.lw(r.RA, r.SP, 0);
    code.comment("restaurar sp");
    code.addi(r.SP, r.SP, 4);
    code.fsw(floatRegisters.FT0, r.SP, 0);
}

/**
 * @param {Generador} code
 */
export const intToString = (code) => {
    /*
        Función intToString
        Espera el entero en t0
        Guarda la dirección del string resultante en el stack
    */
    
    code.pop(r.T0);
    code.comment("Guardar registros que vamos a usar");
    code.addi(r.SP, r.SP, -16);
    code.sw(r.RA, r.SP, 0);
    code.sw(r.T1, r.SP, 4);
    code.sw(r.T2, r.SP, 8);
    code.sw(r.HP, r.SP, 12);
    
    code.comment("Si el número es 0, tratarlo como caso especial");
    code.bnez(r.T0, "intToString_check_negative");
    code.comment("ASCII para '0'");
    code.li(r.T1, 48);
    code.sb(r.T1, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.comment("Null terminator");
    code.sb(r.ZERO, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.j("intToString_restore_and_return");

    code.addLabel("intToString_check_negative");
    code.comment("Ver si el número es negativo");
    code.bgez(r.T0, "intToString_convert_digits");
    code.comment("ASCII para '-'");
    code.li(r.T1, 45);
    code.sb(r.T1, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.comment("Hacer el número positivo");
    code.neg(r.T0, r.T0);
    
    code.addLabel("intToString_convert_digits");
    code.comment("Primero contar dígitos y guardarlos en el stack");
    code.mv(r.T1, r.T0);
    code.comment("Contador de dígitos");
    code.li(r.T2, 0);
    
    code.addLabel("intToString_digit_count_loop");
    code.beqz(r.T1, "intToString_extract_digits");
    code.li(r.T3, 10);
    code.div(r.T1, r.T1, r.T3);
    code.addi(r.T2, r.T2, 1);
    code.j("intToString_digit_count_loop");
    
    code.addLabel("intToString_extract_digits");
    code.comment("Restaurar número original");
    code.mv(r.T1, r.T0);

    code.addLabel("intToString_extract_loop");
    
    code.beqz(r.T2, "intToString_finish_string");
    code.li(r.T3, 10);
    code.comment("Obtener último dígito");
    code.rem(r.T4, r.T1, r.T3);
    code.comment("Dividir por 10");
    code.div(r.T1, r.T1, r.T3);
    code.comment("Convertir a ASCII");
    code.addi(r.T4, r.T4, 48);
    
    code.comment("Guardar dígito en el stack temporalmente");
    code.addi(r.SP, r.SP, -4);
    code.sw(r.T4, r.SP, 0);
    
    code.addi(r.T2, r.T2, -1);
    code.j("intToString_extract_loop");

    code.addLabel("intToString_finish_string");
    code.comment("Contador para dígitos escritos");
    code.mv(r.T2, r.ZERO);
    code.comment("Copiar el número original para contar dígitos");
    code.mv(r.T3, r.T0);
    
    code.addLabel("intToString_count_again")
    code.beqz(r.T3, "intToString_write_digits_loop");
    code.li(r.T4, 10);
    code.div(r.T3, r.T3, r.T4);
    code.addi(r.T2, r.T2, 1);
    code.j("intToString_count_again")

    code.addLabel("intToString_write_digits_loop");

    code.comment("Terminar cuando se han escrito todos los dígitos");
    code.beqz(r.T2, "intToString_finish_write");
    code.comment("Cargar dígito del stack");
    code.lw(r.T1, r.SP, 0);
    code.addi(r.SP, r.SP, 4);
    code.comment("Escribir en heap");
    code.sb(r.T1, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.comment("Decrementar contador");
    code.addi(r.T2, r.T2, -1);
    code.j("intToString_write_digits_loop");

    code.addLabel("intToString_finish_write")
    code.comment("Agregar null terminator")
    code.sb(r.ZERO, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    
    code.addLabel("intToString_restore_and_return")
    code.comment("Restaurar dirección inicial a donde debe estar para fácil acceso");
    code.lw(r.T1, r.SP, 12);
    code.addi(r.SP, r.SP, -4);
    code.sw(r.T1, r.SP, 0);

    code.comment("Restaurar registros");
    code.lw(r.RA, r.SP, 4);
    code.lw(r.T1, r.SP, 8);
    code.lw(r.T2, r.SP, 12);
    code.addi(r.SP, r.SP, 16);
}

/**
 * @param {Generador} code
 */
export const toUpperCase = (code) => {
    code.comment("a0 contiene la dirección del string a convertir");
    code.comment("Preservar registros que usaremos");
    code.pop(r.A0);
    code.addi(r.SP, r.SP, -12);
    code.sw(r.RA, r.SP, 0);
    code.sw(r.FP, r.SP, 4);
    code.sw(r.S1, r.SP, 8);
        
    code.comment("s0 = dirección original del string");
    code.mv(r.FP, r.A0);
    code.comment("s1 = dirección destino (heap)");
    code.mv(r.S1, r.HP);
    
    code.comment("Guardar dirección inicial del resultado en a0");
    code.mv(r.A0, r.S1);
        
    code.addLabel("loop_toUpperCase");
    code.comment("Cargar byte actual");
    code.lb(r.T0, r.FP, 0);
    code.comment("Si es null (0), terminar");
    code.beqz(r.T0, "end_toUpperCase");
    code.comment("Verificar si está entre 'a' (97) y 'z' (122)");
    code.comment("'a'");
    code.li(r.T1, 97);
    code.comment("'z'");
    code.li(r.T2, 122);
    code.comment("Si es menor que 'a', copiar directo");
    code.blt(r.T0, r.T1, "toUpperCase_copy_char");
    code.comment("Si es mayor que 'z', copiar directo");
    code.bgt(r.T0, r.T2, "toUpperCase_copy_char");
    code.comment("Convertir a mayúscula restando 32");
    code.addi(r.T0, r.T0, -32);
        
    code.addLabel("toUpperCase_copy_char");
    code.comment("Guardar carácter en heap");
    code.sb(r.T0, r.S1, 0);
        
    code.comment("Incrementar punteros");
    code.addi(r.FP, r.FP, 1);
    code.addi(r.S1, r.S1, 1);
        
    code.j("loop_toUpperCase");

    code.addLabel("end_toUpperCase");
    code.comment("Añadir null terminator");
    code.sb(r.ZERO, r.S1, 0);
    code.addi(r.S1, r.S1, 1);
        
    code.comment("Actualizar heap pointer");
    code.mv(r.HP, r.S1);
        
    code.comment("Restaurar registros");
    code.lw(r.RA, r.SP, 0);
    code.lw(r.FP, r.SP, 4);
    code.lw(r.S1, r.SP, 8);
    code.addi(r.SP, r.SP, 12);
    code.push(r.A0);
}

/**
 * @param {Generador} code
 */
export const toLowerCase = (code) => {
    code.comment("a0 contiene la dirección del string a convertir");
    code.comment("Preservar registros que usaremos");
    code.pop(r.A0);
    code.addi(r.SP, r.SP, -12);
    code.sw(r.RA, r.SP, 0);
    code.sw(r.FP, r.SP, 4);
    code.sw(r.S1, r.SP, 8);
    
    code.comment("s0 = dirección original del string");
    code.mv(r.FP, r.A0);
    code.comment("s1 = dirección destino (heap)");
    code.mv(r.S1, r.HP);
    code.comment("Guardar dirección inicial del resultado");
    code.mv(r.A0, r.S1);
    //code.push(r.S1);
        
    code.addLabel("loop_toLowerCase");
    code.comment("Cargar byte actual")
    code.lb(r.T0, r.FP, 0);
    code.comment("Si es null (0), terminar");
    code.beqz(r.T0, "end_toLowerCase");
    code.comment("Verificar si está entre 'A' (65) y 'Z' (90)");
    code.comment("A");
    code.li(r.T1, 65);
    code.comment("Z");
    code.li(r.T2, 90);
    code.comment("Si es menor que 'A', copiar directo");
    code.blt(r.T0, r.T1, "toLowerCase_copy_char");
    code.comment("Si es mayor que 'Z', copiar directo");
    code.bgt(r.T0, r.T2, "toLowerCase_copy_char");
    code.comment("Convertir a minúscula sumando 32");
    code.addi(r.T0, r.T0, 32);

    code.addLabel("toLowerCase_copy_char");
    code.comment("Guardar carácter en heap");
    code.sb(r.T0, r.S1, 0);
        
    code.comment("Incrementar punteros");
    code.addi(r.FP, r.FP, 1);
    code.addi(r.S1, r.S1, 1);
    code.j("loop_toLowerCase");

    code.addLabel("end_toLowerCase");
    code.comment("Añadir null terminator");
    code.sb(r.ZERO, r.S1, 0);
    code.addi(r.S1, r.S1, 1);

    code.comment("Actualizar heap pointer");
    code.mv(r.FP, r.S1);
        
    code.comment("Restaurar registros");
    code.lw(r.RA, r.SP, 0);
    code.lw(r.FP, r.SP, 4);
    code.lw(r.S1, r.SP, 8);
    code.addi(r.SP, r.SP, 12);

    code.push(r.A0);
}

/**
 * @param {Generador} code
 */
export const printBoolean = (code) => {
    code.beq(r.A0, r.ZERO, "printBoolean_isZero");
    code.la(r.A0, "true_msg");
    code.j("printBoolean_end")
    code.addLabel("printBoolean_isZero");
    code.la(r.A0, "false_msg");
    code.addLabel("printBoolean_end");
    code.li(r.A7, 4);
    code.ecall();
}

/**
 * @param {Generador} code
 */
export const parseStringToInt = (code) => {
    /*
        Función parseStringToInt
        Espera encontrar la dirección del string en el stack
        Devuelve el número en t0
        Si hay error, salta a error_handler
    */
    code.comment("Obtener la dirección del string del stack");
    code.pop(r.A0);
    
    code.comment("Inicializar resultado")
    code.comment("Aquí acumularemos el número");
    code.li(r.T0, 0);

    code.comment("Verificar si el primer carácter es un signo negativo");
    code.lb(r.T1, r.A0, 0);
    code.comment("ASCII del '-'")
    code.li(r.T2, 45);
    code.beq(r.T1, r.T2, "parseStringToInt_handle_negative")
    code.j("parseStringToInt_process_digits");

    code.addLabel("parseStringToInt_handle_negative");
    
    code.comment("Si es negativo, avanzar al siguiente carácter");
    code.addi(r.A0, r.A0, 1);
    code.comment("Flag para indicar que es negativo");
    code.li(r.T3, 1);
    code.j("parseStringToInt_process_digits_loop");

    code.addLabel("parseStringToInt_process_digits");
    
    code.comment("Flag para indicar que es positivo");
    code.li(r.T3, 0);

    code.addLabel("parseStringToInt_process_digits_loop");
    
    code.comment("Cargar el siguiente carácter");
    code.lb(r.T1, r.A0 ,0);

    code.comment("Si es null terminator, terminamos");

    code.beqz(r.T1, "parseStringToInt_finish_conversion");
    
    code.comment("Verificar si es un dígito (ASCII 48-57)");
    
    code.comment("ASCII de '0'");
    code.li(r.T2, 48);
    code.comment("Si es menor que '0', error");
    code.blt(r.T1, r.T2, "parseStringToInt_error_handler");
    code.comment("ASCII de '9'")
    code.li(r.T2, 57);
    code.comment("Si es mayor que '9', error");
    code.bgt(r.T1, r.T2, "parseStringToInt_error_handler");
    
    code.comment("Convertir ASCII a número");
    code.addi(r.T1, r.T1, -48);
    
    code.comment("Multiplicar resultado actual por 10 y sumar nuevo dígito");
    code.li(r.T2, 10);
    code.mul(r.T0, r.T0, r.T2);
    code.add(r.T0, r.T0, r.T1);
    
    code.comment("Avanzar al siguiente carácter");
    code.addi(r.A0, r.A0, 1);
    code.j("parseStringToInt_process_digits_loop");

    code.comment("Manejador de error (puedes personalizar según necesites)");
    code.addLabel("parseStringToInt_error_handler");
    code.comment("Imprimir mensaje de error");
    code.la(r.A0, "error_msg");
    code.li(r.A7, 4);
    code.ecall();
    
    code.comment("Terminar programa");
    code.li(r.A7, 10);
    code.ecall();

    code.addLabel("parseStringToInt_finish_conversion");
    
    code.comment("Si el flag de negativo está activo, negar el número");
    code.beqz(r.T3, "parseStringToInt_end_parse");
    code.neg(r.T0, r.T0);
    
    code.addLabel("parseStringToInt_end_parse");
    code.push(r.T0);
}

/**
 * @param {Generador} code
 */
export const concatStringInt = (code) => {
    // Función que concatena una cadena con un número
    // a0: dirección de la cadena
    // a1: número entero a concatenar
    // El resultado se guarda en el heap y su dirección se guarda en el stack
    code.comment("Guardar en el stack la dirección en heap donde se guardará el resultado");
    code.push(r.HP)
    
    code.comment("Copiar la cadena original al heap");
    code.addLabel("concatStringInt_copy_string");
    code.lb(r.T1, r.A0, 0);
    code.beq(r.T1, r.ZERO, "concatStrintInt_convert_int");
    code.sb(r.T1, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.addi(r.A0, r.A0, 1);
    code.j("concatStrintInt_copy_string")

    code.addLabel("concatStrintInt_convert_int");
    code.comment("Guardar registros que vamos a usar");
    code.addi(r.SP, r.SP, -12);
    code.sw(r.RA, r.SP, 0);
    code.sw(r.T0, r.SP, 4);
    code.sw(r.T1, r.SP, 8);
    
    code.comment("Mover el número a t0 para trabajar con él");
    code.mv(r.T0, r.A1);
    
    code.comment("Si el número es 0, tratarlo como caso especial")

    code.beqz(r.T0, "concatStrintInt_write_zero");
    
    code.comment("Contador para saber cuántos dígitos necesitamos");
    code.li(r.T1, 0);
    code.mv(r.T2, r.T0);
    
    code.addLabel("concatStrintInt_count_digits");
    code.beqz(r.T2, "concatStrintInt_convert_digits");
    code.comment("Incrementar contador");
    code.addi(r.T1, r.T1, 1);
    code.li(r.T3, 10);
    code.comment("Dividir por 10");
    code.div(r.T2, r.T2, r.T3);
    code.j("concatStrintInt_count_digits");

    code.addLabel("concatStrintInt_convert_digits");
    code.comment("t1 contiene el número de dígitos")
    code.comment("Necesitamos convertir de derecha a izquierda");
    code.comment("Copiar el número original")
    code.mv(r.T2, r.T0);
    
    code.addLabel("concatStrintInt_convert_loop");
    code.beqz(r.T1, "concatStrintInt_end_convert");
    code.li(r.T3, 10);
    code.comment("Obtener el último dígito");
    code.rem(r.T4, r.T2, r.T3);
    code.comment("Dividir por 10");
    code.div(r.T2, r.T2, r.T3);
    
    code.comment("Convertir a ASCII y guardar en el stack temporalmente");
    code.addi(r.T4, r.T4, 48);
    code.push(r.T4);
    
    code.comment("Decrementar contador");
    code.addi(r.T1, r.T1, -1);
    code.j("concatStrintInt_convert_loop");

    code.addLabel("concatStrintInt_write_zero");
    
    code.li(r.T4, 48);
    code.sb(r.T4, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.j("concatStrintInt_finish_concat");
    
    code.addLabel("end_convert");
    code.comment("Ahora escribir los dígitos en orden correcto");

    code.addLabel("concatStrintInt_write_digits")
    code.lw(r.T4, r.SP, 0);
    code.addi(r.SP, r.SP, 4);
    code.comment("Escribir en heap");
    code.sb(r.T4, r.HP, 0);
    code.addi(r.HP, r.HP, 1);
    code.comment("Continuar hasta que el sp regrese a su posición original");
    code.bne(r.SP, r.FP, "concatStrintInt_write_digits")
    
    code.addLabel("concatStrintInt_finish_concat");
    code.comment("Restaurar registros")
    code.lw(r.RA, r.SP, 0);
    code.lw(r.T0, r.SP, 4);
    code.lw(r.T1, r.SP, 8);
    code.addi(r.SP, r.SP, 12);
    
    code.comment("Agregar el null terminator");
    code.sb(r.ZERO, r.HP, 0);
    code.addi(r.T6, r.T6, 1);
}

/**
 * @param {Generador} code
 */
export const compareStrings = (code) => {
    // A0 -> dirección en heap de la primera cadena
    // A1 -> dirección en heap de la segunda cadena
    // result -> push en el stack la dirección en heap de la cadena concatenada
    code.comment("a0 contiene la dirección de la primera cadena");
    code.comment("a1 contiene la dirección de la segunda cadena");
    code.comment("t0 contendrá el resultado (0 si son iguales, 1 si son diferentes)");

    code.addLabel("loop_compare");

    code.comment("Cargar un byte de cada cadena");
    code.comment("Cargar byte de la primera cadena");
    code.lb(r.T1, r.A0, 0);

    code.comment("Cargar byte de la segunda cadena");
    code.lb(r.T2, r.A1, 0);

    code.comment("Si los bytes son diferentes, las cadenas son diferentes");
    code.bne(r.T1, r.T2, "compare_strings_not_equal")
    
    code.comment("Si ambos bytes son cero, llegamos al final y las cadenas son iguales");
    code.beq(r.T1, r.ZERO, "compare_strings_equal");
    
    code.comment("Avanzar a los siguientes caracteres");
    code.addi(r.A0, r.A0, 1);
    code.addi(r.A1, r.A1, 1);
    
    code.comment("Continuar comparando");
    code.j("loop_compare");

    code.addLabel("compare_strings_not_equal");
    code.li(r.T0, 0);
    code.push(r.T0)
    code.ret();

    code.addLabel("compare_strings_equal");
    code.li(r.T0, 1)
    code.push(r.T0)
}

/**
 * 
 * @param {Generador} code 
 */
export const fGreaterOrEqual = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left >= right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.fle(r.T0, fRegs.FT0, fRegs.FT1) // der <= izq
    code.bnez(r.T0, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const greaterOrEqual = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left >= right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.bge(r.T1, r.T0, trueLabel) // izq >= der
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const fLessOrEqual = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left <= right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.fle(r.T0, fRegs.FT1, fRegs.FT0) // der <= izq
    code.bnez(r.T0, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const lessOrEqual = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left <= right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.bge(r.T0, r.T1, trueLabel) // der >= izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const fEqual = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left == right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.feq(r.T0, fRegs.FT1, fRegs.FT0) // der == izq
    code.bnez(r.T0, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const equal = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left == right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.beq(r.T0, r.T1, trueLabel) // der == izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const fNotEqual = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left != right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.feq(r.T0, fRegs.FT1, fRegs.FT0) // der > izq
    code.beq(r.T0, r.ZERO, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}


/**
 * 
 * @param {Generador} code 
 */
export const notEqual = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left == right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.bne(r.T0, r.T1, trueLabel) // der != izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const fLess = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left > right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.flt(r.T0, fRegs.FT1, fRegs.FT0) // der > izq
    code.bnez(r.T0, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const less = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left == right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.blt(r.T1, r.T0, trueLabel) // der > izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const fGreater = (code) => {
    // ft1: left operand
    // ft0 -> right operand

    /*
    if (left > right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.flt(r.T0, fRegs.FT0, fRegs.FT1) // der < izq
    code.bnez(r.T0, trueLabel)
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

/**
 * 
 * @param {Generador} code 
 */
export const greater = (code) => {
    // t1: left operand
    // t0 -> right operand

    /*
    if (left == right) {
        t0 = 1
        push t0
    } else {
        t0 = 0
        push t0
    }
    */
    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.blt(r.T0, r.T1, trueLabel) // der < izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)
}

// * AQUI PONER FUNCIONES EMBEBIDAS
// export const toString

export const builtins = {
    concatString,
    lessOrEqual,
    notEqual,
    less,
    greater,
    greaterOrEqual,
    equal,
    fLess,
    fLessOrEqual,
    fGreater,
    fGreaterOrEqual,
    fEqual,
    fNotEqual,
    compareStrings,
    parseStringToInt,
    parseFloatToInt,
    intToString,
    toLowerCase,
    toUpperCase,
    printBoolean,
    parseStringToFloat
}