import { FrameVisitor } from "./frame.js";
import { Primitivo, Print, ReferenciaVariable } from "./nodos.js";
import { registers as r, floatRegisters as f } from "./risc/constantes.js";
import { Generador } from "./risc/generador.js";
import { BaseVisitor } from "./visitor.js";


export class CompilerVisitor extends BaseVisitor {

    constructor() {
        super();
        this.code = new Generador();

        this.calledBreakForPrint = false;
        this.continueLabel = null;
        this.breakLabel = null;

        this.functionMetada = {}
        this.insideFunction = false;
        this.frameDclIndex = 0;
        this.returnLabel = null;
    }

    /**
     * @type {BaseVisitor['visitExpresionStmt']}
     */
    visitTypeOf(node) {
        node.exp.accept(this);
        const typeVal = this.code.getTopObject().type;
        (new Primitivo({valor: typeVal, tipo: "string"})).accept(this);
    }

    /**
     * @type {BaseVisitor['visitExpresionStmt']}
     */
    visitExpresionStmt(node) {
        node.exp.accept(this);
        this.code.popObject(r.T0);
    }

    /**
     * @type {BaseVisitor['visitPrimitivo']}
     */
    visitPrimitivo(node) {
        this.code.comment(`Primitivo: ${node.valor}`);
        this.code.pushConstant({ type: node.tipo, valor: node.valor });
        this.code.comment(`Fin Primitivo: ${node.valor}`);
    }

    /**
     * @type {BaseVisitor['visitOperacionBinaria']}
     */
    visitOperacionBinaria(node) {
        this.code.comment(`Operacion: ${node.op}`);

        if (node.op === '&&') {
            node.izq.accept(this); // izq
            this.code.popObject(r.T0); // izq

            const labelFalse = this.code.getLabel();
            const labelEnd = this.code.getLabel();

            this.code.beq(r.T0, r.ZERO, labelFalse); // if (!izq) goto labelFalse
            node.der.accept(this); // der
            this.code.popObject(r.T0); // der
            this.code.beq(r.T0, r.ZERO, labelFalse); // if (!der) goto labelFalse

            this.code.li(r.T0, 1);
            this.code.push(r.T0);
            this.code.j(labelEnd);
            this.code.addLabel(labelFalse);
            this.code.li(r.T0, 0);
            this.code.push(r.T0);

            this.code.addLabel(labelEnd);
            this.code.pushObject({ type: 'boolean', length: 4 });
            return
        }

        if (node.op === '||') {
            node.izq.accept(this); // izq
            this.code.popObject(r.T0); // izq

            const labelTrue = this.code.getLabel();
            const labelEnd = this.code.getLabel();

            this.code.bne(r.T0, r.ZERO, labelTrue); // if (izq) goto labelTrue
            node.der.accept(this); // der
            this.code.popObject(r.T0); // der
            this.code.bne(r.T0, r.ZERO, labelTrue); // if (der) goto labelTrue

            this.code.li(r.T0, 0);
            this.code.push(r.T0);

            this.code.j(labelEnd);
            this.code.addLabel(labelTrue);
            this.code.li(r.T0, 1);
            this.code.push(r.T0);

            this.code.addLabel(labelEnd);
            this.code.pushObject({ type: 'boolean', length: 4 });
            return
        }

        node.izq.accept(this); // izq |
        node.der.accept(this); // izq | der

        const isDerFloat = this.code.getTopObject().type === 'float';
        const der = this.code.popObject(isDerFloat ? f.FT0 : r.T0); // der
        const isIzqFloat = this.code.getTopObject().type === 'float';
        const izq = this.code.popObject(isIzqFloat ? f.FT1 : r.T1); // izq

        console.log({izq, der})
        if ((izq.type === 'string' && der.type === 'string')
            || (izq.type === 'char' && der.type === 'char')) {
            this.code.add(r.A0, r.ZERO, r.T1);
            this.code.add(r.A1, r.ZERO, r.T0);

            if (node.op === "==") {
                this.code.callBuiltin("compareStrings");
                this.code.pushObject({ type: 'boolean', length: 4 });
            } else if ((node.op == "+") || (node.op == ",")) {
                this.code.callBuiltin('concatString');
                this.code.pushObject({ type: 'string', length: 4 });
            }

            return;
        }

        if (isIzqFloat || isDerFloat) {
            if (!isIzqFloat) this.code.fcvtsw(f.FT1, r.T1);
            if (!isDerFloat) this.code.fcvtsw(f.FT0, r.T0);

            switch (node.op) {
                case '+':
                    this.code.fadd(f.FT0, f.FT1, f.FT0);
                    break;
                case '-':
                    this.code.fsub(f.FT0, f.FT1, f.FT0);
                    break;
                case '*':
                    this.code.fmul(f.FT0, f.FT1, f.FT0);
                    break;
                case '/':
                    this.code.fdiv(f.FT0, f.FT1, f.FT0);
                    break;
                case '>=':
                    this.code.callBuiltin('fGreaterOrEqual');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
                case '>':
                    this.code.callBuiltin('fGreater');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
                case '<=':
                    this.code.callBuiltin('fLessOrEqual');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
                case '<':
                    this.code.callBuiltin('fLess');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
                case '==':
                    this.code.callBuiltin('fEqual');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
                case '!=':
                    this.code.callBuiltin('fNotEqual');
                    this.code.pushObject({ type: 'boolean', length: 4 });
                    return
            }

            this.code.pushFloat(f.FT0);
            this.code.pushObject({ type: 'float', length: 4 });
            return;
        }

        switch (node.op) {
            case '+':
                this.code.add(r.T0, r.T0, r.T1);
                this.code.push(r.T0);
                break;
            case '-':
                this.code.sub(r.T0, r.T1, r.T0);
                this.code.push(r.T0);
                break;
            case '*':
                this.code.mul(r.T0, r.T0, r.T1);
                this.code.push(r.T0);
                break;
            case '/':
                this.code.div(r.T0, r.T1, r.T0);
                this.code.push(r.T0);
                break;
            case '%':
                this.code.rem(r.T0, r.T1, r.T0);
                this.code.push(r.T0);
                break;
            case '>=':
                this.code.callBuiltin('greaterOrEqual');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
            case '>':
                this.code.callBuiltin('greater');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
            case '<=':
                this.code.callBuiltin('lessOrEqual');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
            case '<':
                this.code.callBuiltin('less');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
            case '==':
                this.code.callBuiltin('equal');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
            case '!=':
                this.code.callBuiltin('notEqual');
                this.code.pushObject({ type: 'boolean', length: 4 });
                return
        }
        this.code.pushObject({ type: 'int', length: 4 });
    }

    /**
     * @type {BaseVisitor['visitOperacionUnaria']}
     */
    visitOperacionUnaria(node) {
        node.exp.accept(this);

        const typeObject = this.code.getTopObject().type;
        const isFloat = typeObject === 'float';
        this.code.popObject(isFloat ? f.FT0 : r.T0);

        switch (node.op) {
            case '-':
                if (isFloat) {
                    this.code.fneg(f.FT0, f.FT0)
                    this.code.pushFloat(f.FT0);
                    this.code.pushObject({ type: 'float', length: 4 });
                    break;
                } else {
                    this.code.li(r.T1, 0);
                    this.code.sub(r.T0, r.T1, r.T0);
                    this.code.push(r.T0);
                    this.code.pushObject({ type: 'int', length: 4 });
                    break;
                }
            case '!':
                if (typeObject === "boolean") {
                    const isZero = this.code.getLabel();
                    const endIsZero = this.code.getLabel();
                    this.code.beq(r.T0, r.ZERO, isZero);
                    this.code.addi(r.T0, r.T0, -1);
                    this.code.j(endIsZero);

                    this.code.addLabel(isZero);
                    this.code.addi(r.T0, r.T0, 1);

                    this.code.addLabel(endIsZero);
                    this.code.push(r.T0);
                    this.code.pushObject({ type: 'boolean', length: 4 });
                }

                break;
        }
    }

    /**
     * @type {BaseVisitor['visitAgrupacion']}
     */
    visitAgrupacion(node) {
        return node.exp.accept(this);
    }

    visitPrint(node) {
        this.code.comment('Print');
        node.exp.accept(this);

        const isFloat = this.code.getTopObject().type === 'float';
        const object = this.code.popObject(isFloat ? f.FA0 : r.A0);

        const tipoPrint = {
            'int': () => this.code.printInt(),
            'char': () => this.code.printString(),
            'string': () => this.code.printString(),
            'float': () => this.code.printFloat(),
            'boolean': () => this.code.callBuiltin("printBoolean")
        }
        tipoPrint[object.type]();

        this.printNewLine();
    }

    printNewLine() {
        (new Primitivo({ valor: "\n", tipo: "string" })).accept(this);
        this.code.popObject(r.A0);
        this.code.printString();
    }

    /**
     * @type {BaseVisitor['visitDeclaracionVariable1']}
     */
    visitDeclaracionVariable1(node) {
        this.code.comment(`Declaracion Variable CON TIPO: ${node.id}`);

        node.exp.accept(this);

        if (node.exp.tipo !== node.tipo) throw new Error("ERROR: tipos no compatibles");

        if (this.insideFunction) {
            const localObject = this.code.getFrameLocal(this.frameDclIndex);
            const valueObj = this.code.popObject(r.T0);

            this.code.addi(r.T1, r.FP, -localObject.offset * 4);
            this.code.sw(r.T0, r.T1);

            // ! inferir el tipo
            localObject.type = valueObj.type;
            this.frameDclIndex++;

            return
        }

        this.code.tagObject(node.id);
        this.code.comment(`Fin declaracion Variable: ${node.id}`);
    }

    /**
     * @type {BaseVisitor['visitDeclaracionVariable']}
     */
    visitDeclaracionVariable(node) {
        this.code.comment(`Declaracion Variable: ${node.id}`);

        node.exp.accept(this);

        if (this.insideFunction) {
            const localObject = this.code.getFrameLocal(this.frameDclIndex);
            const valueObj = this.code.popObject(r.T0);

            this.code.addi(r.T1, r.FP, -localObject.offset * 4);
            this.code.sw(r.T0, r.T1);

            // ! inferir el tipo
            localObject.type = valueObj.type;
            this.frameDclIndex++;

            return
        }

        this.code.tagObject(node.id);
        this.code.comment(`Fin declaracion Variable: ${node.id}`);
    }

    /**
     * @type {BaseVisitor['visitAsignacion']}
     */
    visitAsignacion(node) {
        this.code.comment(`Asignacion Variable: ${node.id}`);

        node.asgn.accept(this);

        const isFloat = this.code.getTopObject().type === 'float';
        const valueObject = this.code.popObject(isFloat ? f.FT0 : r.T0);
        const [offset, variableObject] = this.code.getObject(node.id);

        if (this.insideFunction) {
            this.code.addi(r.T1, r.FP, -variableObject.offset * 4); // ! REVISAR
            this.code.sw(r.T0, r.T1); // ! revisar
            return
        }

        this.code.addi(r.T1, r.SP, offset);
        this.code.sw(r.T0, r.T1);

        variableObject.type = valueObject.type;

        this.code.push(r.T0);
        this.code.pushObject(valueObject);

        this.code.comment(`Fin Asignacion Variable: ${node.id}`);
    }


    /**
     * @type {BaseVisitor['visitReferenciaVariable']}
     */
    visitReferenciaVariable(node) {
        this.code.comment(`Referencia a variable ${node.id}: ${JSON.stringify(this.code.objectStack)}`);


        const [offset, variableObject] = this.code.getObject(node.id);

        if (this.insideFunction) {
            this.code.addi(r.T1, r.FP, -variableObject.offset * 4);
            this.code.lw(r.T0, r.T1);
            this.code.push(r.T0);
            this.code.pushObject({ ...variableObject, id: undefined });
            return
        }

        this.code.addi(r.T0, r.SP, offset);
        this.code.lw(r.T1, r.T0);
        this.code.push(r.T1);
        this.code.pushObject({ ...variableObject, id: undefined });

        // this.code.comment(`Fin Referencia Variable: ${node.id}`);
        this.code.comment(`Fin referencia de variable ${node.id}: ${JSON.stringify(this.code.objectStack)}`);
    }


    /**
     * @type {BaseVisitor['visitBloque']}
     */
    visitBloque(node) {
        this.code.comment('Inicio de bloque');

        this.code.newScope();

        node.dcls.forEach(d => d.accept(this));

        this.code.comment('Reduciendo la pila');
        const bytesToRemove = this.code.endScope();

        if (bytesToRemove > 0) {
            this.code.addi(r.SP, r.SP, bytesToRemove);
        }

        this.code.comment('Fin de bloque');
    }


    /**
     * @type {BaseVisitor['visitIf']}
     */
    visitIf(node) {
        this.code.comment('Inicio de If');

        this.code.comment('Condicion');
        node.cond.accept(this);
        this.code.popObject(r.T0);
        this.code.comment('Fin de condicion');
        /*
        // no else
        if (!cond) goto endIf
            ...
        endIf:

        // else
        if (!cond) goto else
            ...
        goto endIf
        else:
            ...
        endIf:

        */

        const hasElse = !!node.stmtFalse

        if (hasElse) {
            const elseLabel = this.code.getLabel();
            const endIfLabel = this.code.getLabel();

            this.code.beq(r.T0, r.ZERO, elseLabel);
            this.code.comment('Rama verdadera');
            node.stmtTrue.accept(this);
            this.code.j(endIfLabel);
            this.code.addLabel(elseLabel);
            this.code.comment('Rama falsa');
            node.stmtFalse.accept(this);
            this.code.addLabel(endIfLabel);
        } else {
            const endIfLabel = this.code.getLabel();
            this.code.beq(r.T0, r.ZERO, endIfLabel);
            this.code.comment('Rama verdadera');
            node.stmtTrue.accept(this);
            this.code.addLabel(endIfLabel);
        }

        this.code.comment('Fin del If');
    }

    /**
     * @type {BaseVisitor['visitWhile']}
     */
    visitWhile(node) {
        /*
        startWhile:
            cond
        if !cond goto endWhile
            stmt
            goto startWhile
        endWhile:
        */

        const startWhileLabel = this.code.getLabel();
        const prevContinueLabel = this.continueLabel;
        this.continueLabel = startWhileLabel;

        const endWhileLabel = this.code.getLabel();
        const prevBreakLabel = this.breakLabel;
        this.breakLabel = endWhileLabel;

        this.code.addLabel(startWhileLabel);
        this.code.comment('Condicion');
        node.cond.accept(this);
        this.code.popObject(r.T0);
        this.code.comment('Fin de condicion');
        this.code.beq(r.T0, r.ZERO, endWhileLabel);
        this.code.comment('Cuerpo del while');
        node.stmt.accept(this);
        this.code.j(startWhileLabel);
        this.code.addLabel(endWhileLabel);

        this.continueLabel = prevContinueLabel;
        this.breakLabel = prevBreakLabel;
    }

    /**
     * @type {BaseVisitor['visitFor']}
     */
    visitFor(node) {
        // node.cond
        // node.inc
        // node.stmt


        /*
            {
                init()
                startFor:
                    cond
                if !cond goto endFor
                    stmt
                incrementLabel:
                    inc
                    goto startFor
                endFor:
            } 
        */

        this.code.comment('For');

        const startForLabel = this.code.getLabel();

        const endForLabel = this.code.getLabel();
        const prevBreakLabel = this.breakLabel;
        this.breakLabel = endForLabel;

        const incrementLabel = this.code.getLabel();
        const prevContinueLabel = this.continueLabel;
        this.continueLabel = incrementLabel;

        this.code.newScope();

        node.init.accept(this);

        this.code.addLabel(startForLabel);
        this.code.comment('Condicion');
        node.cond.accept(this);
        this.code.popObject(r.T0);
        this.code.comment('Fin de condicion');
        this.code.beq(r.T0, r.ZERO, endForLabel);

        this.code.comment('Cuerpo del for');
        node.stmt.accept(this);

        this.code.addLabel(incrementLabel);
        node.inc.accept(this);
        this.code.popObject(r.T0);
        this.code.j(startForLabel);

        this.code.addLabel(endForLabel);

        this.code.comment('Reduciendo la pila');
        const bytesToRemove = this.code.endScope();

        if (bytesToRemove > 0) {
            this.code.addi(r.SP, r.SP, bytesToRemove);
        }

        this.continueLabel = prevContinueLabel;
        this.breakLabel = prevBreakLabel;

        this.code.comment('Fin de For');
    }


    /**
     * @type {BaseVisitor['node']}
     */
    visitBreak(node) {
        this.code.j(this.breakLabel);
    }

    /**
     * @type {BaseVisitor['node']}
     */
    visitContinue(node) {
        this.code.j(this.continueLabel);
    }

    /**
     * @type {BaseVisitor['visitFuncDcl']}
     */
    visitFuncDcl(node) {
        const baseSize = 2; // | ra | fp |

        const paramSize = node.params.length; // | ra | fp | p1 | p2 | ... | pn |

        const frameVisitor = new FrameVisitor(baseSize + paramSize);
        node.bloque.accept(frameVisitor);
        const localFrame = frameVisitor.frame;
        const localSize = localFrame.length; // | ra | fp | p1 | p2 | ... | pn | l1 | l2 | ... | ln |

        const returnSize = 1; // | ra | fp | p1 | p2 | ... | pn | l1 | l2 | ... | ln | rv |

        const totalSize = baseSize + paramSize + localSize + returnSize;
        this.functionMetada[node.id] = {
            frameSize: totalSize,
            returnType: node.tipo,
        }

        const instruccionesDeMain = this.code.instrucciones;
        const instruccionesDeDeclaracionDeFuncion = []
        this.code.instrucciones = instruccionesDeDeclaracionDeFuncion;

        node.params.forEach((param, index) => {
            this.code.pushObject({
                id: param.id,
                type: param.tipo,
                length: 4,
                offset: baseSize + index
            })
        });

        localFrame.forEach(variableLocal => {
            this.code.pushObject({
                ...variableLocal,
                length: 4,
                type: 'local',
            })
        });

        this.insideFunction = node.id;
        this.frameDclIndex = 0;
        this.returnLabel = this.code.getLabel();

        this.code.comment(`Declaracion de funcion ${node.id}`);
        this.code.addLabel(node.id);

        node.bloque.accept(this);

        this.code.addLabel(this.returnLabel);

        this.code.add(r.T0, r.ZERO, r.FP);
        this.code.lw(r.RA, r.T0);
        this.code.jalr(r.ZERO, r.RA, 0);
        this.code.comment(`Fin de declaracion de funcion ${node.id}`);

        // Limpiar metadatos
        for (let i = 0; i < paramSize + localSize; i++) {
            this.code.objectStack.pop(); // ! aqui no retrocedemos el SP, hay que hacerlo más adelanto
        }

        this.code.instrucciones = instruccionesDeMain

        instruccionesDeDeclaracionDeFuncion.forEach(instruccion => {
            this.code.instrucionesDeFunciones.push(instruccion);
        });

    }

    /**
     * @type {BaseVisitor['visitLlamada']}
     */
    visitLlamada(node) {
        if (!(node.callee instanceof ReferenciaVariable)) return

        const nombreFuncion = node.callee.id;

        this.code.comment(`Llamada a funcion ${nombreFuncion}`);

        if (nombreFuncion === "parseInt") {
            node.args[0].accept(this);
            const topObj = this.code.getTopObject();

            switch (topObj.type) {
                case "float":
                    this.code.callBuiltin("parseFloatToInt");
                    this.code.popTopObject();
                    this.code.pushObject({ type: 'int', length: 4 });
                    break;
                case "string":
                    this.code.callBuiltin("parseStringToInt");
                    this.code.pushObject({ type: 'int', length: 4 });
                    break;
            }
        } else if (nombreFuncion === "toString") {
            node.args[0].accept(this);
            const topObj = this.code.getTopObject();

            console.log({topObj})
            switch (topObj.type) {
                case "int":
                    this.code.callBuiltin("intToString");
                    this.code.popTopObject();
                    this.code.pushObject({ type: 'string', length: 4 });
                    break;
            }
        } else if (nombreFuncion === "toLowerCase") {
            node.args[0].accept(this);
            const topObj = this.code.getTopObject();

            console.log({topObj})
            switch (topObj.type) {
                case "string":
                    this.code.callBuiltin("toLowerCase");
                    this.code.pushObject({ type: 'string', length: 4 });
                    break;
            }
        } else if (nombreFuncion === "toUpperCase") {
            node.args[0].accept(this);
            const topObj = this.code.getTopObject();

            console.log({topObj})
            switch (topObj.type) {
                case "string":
                    this.code.callBuiltin("toUpperCase");
                    this.code.pushObject({ type: 'string', length: 4 });
                    break;
            }
        } else if (nombreFuncion === "parseFloat") {
            node.args[0].accept(this);
            const topObj = this.code.getTopObject();

            switch (topObj.type) {
                case "string":
                    this.code.callBuiltin("parseStringToFloat");
                    this.code.pushObject({ type: 'float', length: 4 });
                    break;
            }
        } else {
            const etiquetaRetornoLlamada = this.code.getLabel();

            // 1. Guardar los argumentos
            this.code.addi(r.SP, r.SP, -4 * 2)
            node.args.forEach((arg) => {
                arg.accept(this)
            });
            this.code.addi(r.SP, r.SP, 4 * (node.args.length + 2))

            // Calcular la dirección del nuevo FP en T1
            this.code.addi(r.T1, r.SP, -4)

            // Guardar direccion de retorno
            this.code.la(r.T0, etiquetaRetornoLlamada)
            this.code.push(r.T0)

            // Guardar el FP
            this.code.push(r.FP)
            this.code.addi(r.FP, r.T1, 0)

            const frameSize = this.functionMetada[nombreFuncion].frameSize
            this.code.addi(r.SP, r.SP, -(frameSize - 2) * 4)


            // Saltar a la función
            this.code.j(nombreFuncion)
            this.code.addLabel(etiquetaRetornoLlamada)

            // Recuperar el valor de retorno
            const returnSize = frameSize - 1;
            this.code.addi(r.T0, r.FP, -returnSize * 4)
            this.code.lw(r.A0, r.T0)

            // Regresar el FP al contexto de ejecución anterior
            this.code.addi(r.T0, r.FP, -4)
            this.code.lw(r.FP, r.T0)

            // Regresar mi SP al contexto de ejecución anterior
            this.code.addi(r.SP, r.SP, frameSize * 4)


            this.code.push(r.A0)
            this.code.pushObject({ type: this.functionMetada[nombreFuncion].returnType, length: 4 })
        }


        this.code.comment(`Fin de llamada a funcion ${nombreFuncion}`);
    }


    /**
     * @type {BaseVisitor['visitReturn']}
     */
    visitReturn(node) {
        this.code.comment('Inicio Return');

        if (node.exp) {
            node.exp.accept(this);
            this.code.popObject(r.A0);

            const frameSize = this.functionMetada[this.insideFunction].frameSize
            const returnOffest = frameSize - 1;
            this.code.addi(r.T0, r.FP, -returnOffest * 4)
            this.code.sw(r.A0, r.T0)
        }

        this.code.j(this.returnLabel);
        this.code.comment('Final Return');
    }



}