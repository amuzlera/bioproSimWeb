export class CultureGenerator {
    constructor(microorganism, bioreactor, culture_conditions) {
        this.morg = JSON.parse(JSON.stringify(microorganism));
        this.bior = JSON.parse(JSON.stringify(bioreactor));
        this.culture = JSON.parse(JSON.stringify(culture_conditions));
        this.graph_data = CultureGenerator.getInitialData(culture_conditions);
        this.culture.overflow = false;

        this.calculateCultureDependableVariables();
    }



    calculateCultureDependableVariables() {
        this.culture.cl_max = this.getOxygenSolubility()
        console.log(this.calculateHenryConstantAtTemperature())
        this.bior.OTR_max = this.bior.kla * this.culture.cl_max;
        const gamma_s = 4, gamma_x = 4.2;  // Hardcoded for now
        this.morg.yxov = 1 / ((gamma_s / (this.morg.yxsv * 4)) - gamma_x / 4);
        this.morg.mo = this.morg.ms * gamma_s / 4;
        this.morg.yxn = 5;  // Hardcoded to standard biomass
        this.morg.yxs = 1 / (1 / this.morg.yxsv + this.morg.ms / this.morg.umax);
        this.culture.fce_sr = this.culture.fce_sr || 0;
        this.culture.fn_nr = this.culture.fn_nr || 0;
        this.culture.starve_counter = this.morg.starve_counter || 2;
    }

    addFlux(f, sr, nr) {
        this.culture.f = f;
        this.culture.fce_sr = sr;
        this.culture.fn_nr = nr;
    }

    addOverflow() {
        this.culture.overflow = true;
    }

    removeOverflow() {
        this.culture.overflow = false;
    }

    static getInitialData(culture_conditions) {
        return {
            xv: [culture_conditions.xv],
            fce: [culture_conditions.fce],
            fn: [culture_conditions.fn],
            v: [culture_conditions.v],
            time: [0]
        };
    }

    exportData() {
        let exportedData = {};
        for (let key in this.graph_data) {
            if (Array.isArray(this.graph_data[key])) {
                exportedData[key] = this.graph_data[key];
            }
        }
        return exportedData;
    }

    //############## oxygen ######################


    static HENRY_30C = 0.00123;
    static R = 8.314;

    calculateHenryConstantAtTemperature() {
        const tempKelvin = this.culture.t + 273.15;
        const deltaHSol = -20000;

        const henryTarget = CultureGenerator.HENRY_30C * Math.exp(-deltaHSol / CultureGenerator.R * (1 / tempKelvin - 1 / 303.15));

        return henryTarget;
    }

    getOxygenSolubility() {
        const henrysConstant = this.calculateHenryConstantAtTemperature(this.culture.t);
        const solubility = henrysConstant * this.culture.ppO2;
        return solubility;
    }

    getRO2(dx, dt) {
        const rx = dx / dt; // rx in cmol/h
        return Math.min(rx / this.morg.yxov + this.morg.mo * this.culture.xv, this.bior.OTR_max)  // Pirt for oxygen ro2 = rx/y'x/o + mo*x
    }


    getCl(dx, dt){
        const ro2 = this.getRO2(dx, dt);
        return this.getOxygenSolubility() - ro2/this.bior.kla
    }

//##################### Biomass ####################3
    getExponentialDx(dt) {
        return this.culture.xv * Math.exp(this.morg.umax * dt) - this.culture.xv;
    }

    getOxygenLimDx(dt) {
        return (this.culture.v * this.bior.OTR_max - this.morg.mo * this.culture.xv) * this.morg.yxov * dt;
    }

    getFnLimDx(dt) {
        return this.morg.yxn * (this.culture.f * this.culture.fn_nr * dt + this.culture.fn);
    }

    getFceLimDx(dt) {
        const fsrms = (this.culture.f * this.culture.fce_sr) / this.morg.ms;
        const dxFromRemanentFce = this.morg.yxs * this.culture.fce;
        return fsrms + (this.culture.xv - fsrms) * Math.exp(-this.morg.yxsv * this.morg.ms * dt) - this.culture.xv + dxFromRemanentFce;

    }


    showLimitation(dx_exp, dx_oxygen_lim, dx_fn_lim, dx_fce_lim) {
        const textLabel = document.getElementById("limitation");

        const limitations = [
            { value: dx_exp, label: 'Sin limite' },
            { value: dx_oxygen_lim, label: 'Límite de oxígeno' },
            { value: dx_fn_lim, label: 'Límite de nitrógeno' },
            { value: dx_fce_lim, label: 'Límite de carbono' }
        ];

        limitations.sort((a, b) => a.value - b.value);
        const mostLimitingFactor = limitations[0];
        textLabel.textContent = `Limitación actual: ${mostLimitingFactor.label}`;
    }


    getDx(dt) {
        let dx_exp = this.getExponentialDx(dt);
        let dx_oxygen_lim = this.getOxygenLimDx(dt);
        let dx_fn_lim = this.getFnLimDx(dt);
        let dx_fce_lim = this.getFceLimDx(dt);

        let dx = Math.min(dx_exp, dx_oxygen_lim, dx_fn_lim, dx_fce_lim);
        if (dx_fce_lim < 0) {
            this.culture.starve_counter = Math.max(this.culture.starve_counter - dt, 0) // Starvation will go down til 0, then cells start dying
        } else {
            this.culture.starve_counter = Math.min(this.culture.starve_counter + dt, 2) // to regenerate the starve counter to max (current =2h)
        }
        this.showLimitation(dx_exp, dx_oxygen_lim, dx_fn_lim, dx_fce_lim)
        return this.culture.starve_counter > 0 ? Math.max(dx, 0) : dx;
    }

    getDs(dt, dx) {
        return this.culture.f * this.culture.fce_sr * dt -
            (1 / this.morg.yxsv) * dx -
            this.morg.ms * this.culture.xv * dt -
            this.morg.ms * dx * dt / 2;
    }

    getDn(dt, dx) {
        return this.culture.f * this.culture.fn_nr * dt - dx / this.morg.yxn;
    }

    getDv(dt) {
        return this.culture.overflow ? 0 : this.culture.f * dt;
    }

    updateCulture(dt, updates) {
        for (let key in updates) {
            let old_value = this.culture[key] || 0;
            let new_value = Math.max(old_value + updates[key], 0);
            this.culture[key] = new_value;
            this.graph_data[key].push(new_value);
        }
        this.graph_data.time.push(this.graph_data.time[this.graph_data.time.length - 1] + dt);
    }

    grow(dt) {
        let dx = this.getDx(dt);
        let ds = this.getDs(dt, Math.max(dx, 0));
        let dn = this.getDn(dt, Math.max(dx, 0));
        let dv = this.getDv(dt);

        if (this.culture.overflow) {
            dx -= this.culture.xv / this.culture.v * this.culture.f * dt;
            ds -= this.culture.fce / this.culture.v * this.culture.f * dt;
            dn -= this.culture.fn / this.culture.v * this.culture.f * dt;
        }

        let updates = {
            xv: dx,
            fce: ds,
            fn: dn,
            v: dv
        };

        this.updateCulture(dt, updates);
        return {
            xv: this.culture.xv,
            fce: this.culture.fce,
            fn: this.culture.fn,
            v: this.culture.v,
            cl: this.getCl(dx, dt)*1000
        };
    }
}



// Cosas que todavia no funcionan bien


/*

Tareas

-- EL cl se va a 0 pero no se limita en oxigeno, ambos procesos se calculan de manera diferente. Revisar para que coincidan




****************** TODO LIST *********************
-- Realizar cuentas y comparar con el modelo. Se podria hacer una situacion de testing para la clase
-- Agregar lectura de pH
-- Agregar metabolismo que modifiquen el pH
-- Agregar formacion de producto como parametro de cultivo
-- Agregar formacion de producto por limitacion por oxigeno
-- Agregar opcion para meter inhibidores

-- Agregar ventana de selecion de microorganismo y reactores
-- Agregar panel tipo juego, con objetivos y metas
-- Agregar costo operativo del reactor
-- Agregar ventana o panel de condiciones de cultivo, tipo y cantidades de sustratos inucolo agitacion? agregar funcion de kla y agitacion

-- Agregar inductor para producto? raro no me convence pero podria ser

-- El el grafico va modificandose en tamaño para incluir siempre los datos nuevos, si se hace zoom o algo esto se pierde y no se puede volver. El boton
 de "seguir datos nuevos" te lleva al final pero no lo sigue

*/
