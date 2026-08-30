"use strict";

/**
 * ================================================================
 * APLICACIÓN DE HORARIOS
 * ================================================================
 *
 * Arquitectura:
 *
 *  Schedule      -> Representa un horario.
 *  Subject       -> Representa una materia.
 *  StorageManager -> Guarda y recupera información.
 *  ScheduleManager -> Administra los horarios.
 *  UIManager     -> Se encarga de la interfaz.
 *  App            -> Coordina toda la aplicación.
 *
 * Actualmente utilizamos localStorage.
 *
 * En una futura versión podremos reemplazar StorageManager por
 * una implementación que utilice una API / Supabase / Firebase
 * sin tener que reescribir toda la aplicación.
 */


/* ================================================================
   CONFIGURACIÓN
   ================================================================ */

const CONFIG = {

    STORAGE_KEY: "mi_aplicacion_horarios",

    DAYS: [
        {
            id: "lunes",
            name: "Lunes"
        },
        {
            id: "martes",
            name: "Martes"
        },
        {
            id: "miercoles",
            name: "Miércoles"
        },
        {
            id: "jueves",
            name: "Jueves"
        },
        {
            id: "viernes",
            name: "Viernes"
        },
        {
            id: "sabado",
            name: "Sábado"
        },
        {
            id: "domingo",
            name: "Domingo"
        }
    ],

    /*
     * Hora mínima y máxima que mostrará el calendario.
     */
    START_HOUR: 6,
    END_HOUR: 22,

    /*
     * Altura visual de una hora en el calendario.
     */
    HOUR_HEIGHT: 60
};


/* ================================================================
   UTILIDADES
   ================================================================ */

/**
 * Genera un identificador único.
 *
 * No necesitamos un sistema complicado para la versión local.
 */
function generateId() {

    return Date.now().toString(36) +
        Math.random().toString(36).substring(2);
}


/**
 * Convierte una hora "HH:MM" a minutos.
 *
 * Ejemplo:
 *
 * "07:30" -> 450
 */
function timeToMinutes(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    return hours * 60 + minutes;
}


/**
 * Convierte minutos a una cadena HH:MM.
 */
function minutesToTime(totalMinutes) {

    const hours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}


/* ================================================================
   CLASE SUBJECT
   ================================================================ */

/**
 * Representa una materia dentro de un horario.
 */
class Subject {

    constructor({

        id = generateId(),

        name,

        course = "",

        professor = "",

        room = "",

        day = "lunes",

        startTime = "07:00",

        endTime = "08:00",

        color = "#4f46e5"

    }) {

        this.id = id;

        this.name = name;

        this.course = course;

        this.professor = professor;

        this.room = room;

        this.day = day;

        this.startTime = startTime;

        this.endTime = endTime;

        this.color = color;
    }


    /**
     * Comprueba que la información básica
     * de la materia sea válida.
     */
    isValid() {

        if (!this.name.trim()) {

            return false;
        }

        const start =
            timeToMinutes(this.startTime);

        const end =
            timeToMinutes(this.endTime);

        /*
         * La hora final debe ser posterior
         * a la hora inicial.
         */
        if (end <= start) {

            return false;
        }

        return true;
    }


    /**
     * Devuelve la duración de la clase en minutos.
     */
    getDuration() {

        return (
            timeToMinutes(this.endTime) -
            timeToMinutes(this.startTime)
        );
    }
}


/* ================================================================
   CLASE SCHEDULE
   ================================================================ */

/**
 * Representa un horario completo.
 *
 * Un horario puede contener muchas materias.
 */
class Schedule {

    constructor({

        id = generateId(),

        name,

        description = "",

        subjects = []

    }) {

        this.id = id;

        this.name = name;

        this.description = description;

        /*
         * Nos aseguramos de que las materias
         * sean objetos Subject.
         */
        this.subjects = subjects.map(
            subject => {

                if (subject instanceof Subject) {

                    return subject;
                }

                return new Subject(subject);
            }
        );
    }


    /**
     * Agrega una materia.
     */
    addSubject(subject) {

        if (!(subject instanceof Subject)) {

            throw new Error(
                "Debe proporcionarse un objeto Subject."
            );
        }

        if (!subject.isValid()) {

            throw new Error(
                "Los datos de la materia no son válidos."
            );
        }

        this.subjects.push(subject);
    }


    /**
     * Busca una materia por su ID.
     */
    findSubject(subjectId) {

        return this.subjects.find(
            subject => subject.id === subjectId
        );
    }


    /**
     * Elimina una materia.
     */
    removeSubject(subjectId) {

        this.subjects =
            this.subjects.filter(
                subject =>
                    subject.id !== subjectId
            );
    }


    /**
     * Actualiza una materia existente.
     */
    updateSubject(updatedSubject) {

        const index =
            this.subjects.findIndex(
                subject =>
                    subject.id === updatedSubject.id
            );

        if (index === -1) {

            return false;
        }

        this.subjects[index] =
            updatedSubject;

        return true;
    }
}


/* ================================================================
   CLASE STORAGE MANAGER
   ================================================================ */

/**
 * Se encarga exclusivamente de guardar
 * y recuperar los datos.
 *
 * Esta separación es importante:
 *
 * La aplicación NO necesita saber cómo
 * se almacenan los datos.
 *
 * Actualmente:
 *
 * localStorage
 *
 * Futuro:
 *
 * API / Supabase / Firebase
 */
class StorageManager {

    constructor(storageKey) {

        this.storageKey = storageKey;
    }


    /**
     * Guarda todos los horarios.
     */
    saveSchedules(schedules) {

        const data =
            JSON.stringify(schedules);

        localStorage.setItem(
            this.storageKey,
            data
        );
    }


    /**
     * Recupera todos los horarios.
     */
    loadSchedules() {

        const data =
            localStorage.getItem(
                this.storageKey
            );

        if (!data) {

            return [];
        }

        try {

            const parsed =
                JSON.parse(data);

            return parsed.map(
                schedule =>
                    new Schedule(schedule)
            );

        } catch (error) {

            console.error(
                "Error leyendo los horarios:",
                error
            );

            return [];
        }
    }


    /**
     * Elimina toda la información.
     *
     * Actualmente no la utilizamos directamente,
     * pero será útil posteriormente.
     */
    clear() {

        localStorage.removeItem(
            this.storageKey
        );
    }
}


/* ================================================================
   CLASE SCHEDULE MANAGER
   ================================================================ */

/**
 * Controla la lógica de negocio relacionada
 * con los horarios.
 */
class ScheduleManager {

    constructor(storageManager) {

        this.storage =
            storageManager;

        this.schedules =
            this.storage.loadSchedules();

        this.currentScheduleId =
            this.schedules.length > 0
                ? this.schedules[0].id
                : null;
    }


    /**
     * Devuelve el horario actualmente seleccionado.
     */
    getCurrentSchedule() {

        return this.schedules.find(
            schedule =>
                schedule.id ===
                this.currentScheduleId
        );
    }


    /**
     * Crea un horario nuevo.
     */
    createSchedule(name, description) {

        const schedule =
            new Schedule({

                name,

                description

            });

        this.schedules.push(schedule);

        this.currentScheduleId =
            schedule.id;

        this.save();

        return schedule;
    }


    /**
     * Cambia el horario activo.
     */
    selectSchedule(scheduleId) {

        const exists =
            this.schedules.some(
                schedule =>
                    schedule.id === scheduleId
            );

        if (!exists) {

            return false;
        }

        this.currentScheduleId =
            scheduleId;

        return true;
    }


    /**
     * Elimina un horario.
     */
    deleteCurrentSchedule() {

        if (!this.currentScheduleId) {

            return false;
        }

        this.schedules =
            this.schedules.filter(
                schedule =>
                    schedule.id !==
                    this.currentScheduleId
            );


        if (this.schedules.length > 0) {

            this.currentScheduleId =
                this.schedules[0].id;

        } else {

            this.currentScheduleId =
                null;
        }

        this.save();

        return true;
    }


    /**
     * Agrega una materia al horario actual.
     */
    addSubject(subject) {

        const schedule =
            this.getCurrentSchedule();

        if (!schedule) {

            throw new Error(
                "No existe un horario seleccionado."
            );
        }

        schedule.addSubject(subject);

        this.save();
    }


    /**
     * Actualiza una materia.
     */
    updateSubject(subject) {

        const schedule =
            this.getCurrentSchedule();

        if (!schedule) {

            return false;
        }

        const result =
            schedule.updateSubject(subject);

        this.save();

        return result;
    }


    /**
     * Elimina una materia.
     */
    deleteSubject(subjectId) {

        const schedule =
            this.getCurrentSchedule();

        if (!schedule) {

            return false;
        }

        schedule.removeSubject(
            subjectId
        );

        this.save();

        return true;
    }


    /**
     * Guarda el estado actual.
     */
    save() {

        this.storage.saveSchedules(
            this.schedules
        );
    }
}


/* ================================================================
   CLASE UI MANAGER
   ================================================================ */

/**
 * Controla exclusivamente la interfaz gráfica.
 *
 * Esta clase no debería encargarse de guardar
 * información en localStorage.
 */
class UIManager {

    constructor(app) {

        this.app = app;

        /*
         * Referencias a elementos HTML.
         */
        this.elements = {

            scheduleSelector:
                document.getElementById(
                    "selectorHorario"
                ),

            scheduleName:
                document.getElementById(
                    "nombreHorario"
                ),

            scheduleDescription:
                document.getElementById(
                    "descripcionHorario"
                ),

            schedule:
                document.getElementById(
                    "schedule"
                ),

            modalHorario:
                document.getElementById(
                    "modalHorario"
                ),

            modalMateria:
                document.getElementById(
                    "modalMateria"
                ),

            formHorario:
                document.getElementById(
                    "formHorario"
                ),

            formMateria:
                document.getElementById(
                    "formMateria"
                )
        };
    }


    /**
     * Refresca toda la interfaz.
     */
    render() {

        this.renderScheduleSelector();

        this.renderScheduleInformation();

        this.renderCalendar();
    }


    /**
     * Dibuja el selector de horarios.
     */
    renderScheduleSelector() {

        const selector =
            this.elements.scheduleSelector;

        selector.innerHTML = "";


        if (
            this.app.scheduleManager.schedules
                .length === 0
        ) {

            const option =
                document.createElement("option");

            option.textContent =
                "No hay horarios";

            selector.appendChild(option);

            return;
        }


        this.app.scheduleManager.schedules
            .forEach(schedule => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    schedule.id;

                option.textContent =
                    schedule.name;

                option.selected =
                    schedule.id ===
                    this.app.scheduleManager
                        .currentScheduleId;

                selector.appendChild(option);
            });
    }


    /**
     * Muestra la información del horario actual.
     */
    renderScheduleInformation() {

        const schedule =
            this.app.scheduleManager
                .getCurrentSchedule();


        if (!schedule) {

            this.elements.scheduleName
                .textContent =
                "Sin horario";

            this.elements.scheduleDescription
                .textContent =
                "Crea tu primer horario.";

            return;
        }


        this.elements.scheduleName
            .textContent =
            schedule.name;

        this.elements.scheduleDescription
            .textContent =
            schedule.description ||
            "Sin descripción";
    }


    /**
     * Construye el calendario semanal.
     */
    /**
     * Construye el calendario semanal.
     */
    renderCalendar() {
        const container = this.elements.schedule;
        container.innerHTML = "";

        const schedule = this.app.scheduleManager.getCurrentSchedule();

        if (!schedule) {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>📅 No tienes horarios</h2>
                    <p>Crea un horario para comenzar.</p>
                </div>
            `;
            return;
        }

        /* Columna de horas */
        const timeColumn = document.createElement("div");
        timeColumn.className = "time-column";

        const emptyHeader = document.createElement("div");
        emptyHeader.className = "day-header";
        emptyHeader.innerHTML = "&nbsp;"; // Espacio para forzar misma altura
        timeColumn.appendChild(emptyHeader);

        const timeBody = document.createElement("div");
        timeBody.className = "day-body";

        for (let hour = CONFIG.START_HOUR; hour < CONFIG.END_HOUR; hour++) {
            const label = document.createElement("div");
            label.className = "time-label";
            label.textContent = `${String(hour).padStart(2, "0")}:00`;
            timeBody.appendChild(label);
        }
        timeColumn.appendChild(timeBody);
        container.appendChild(timeColumn);

        /* Columnas de los días */
        CONFIG.DAYS.forEach(day => {
            const column = document.createElement("div");
            column.className = "day-column";

            const header = document.createElement("div");
            header.className = "day-header";
            header.textContent = day.name;
            column.appendChild(header);

            // Contenedor interno donde se calculan las posiciones reales (top: 0px = 06:00)
            const dayBody = document.createElement("div");
            dayBody.className = "day-body";

            for (let hour = CONFIG.START_HOUR; hour < CONFIG.END_HOUR; hour++) {
                const line = document.createElement("div");
                line.className = "hour-line";
                dayBody.appendChild(line);
            }

            const subjects = schedule.subjects.filter(
                subject => subject.day === day.id
            );

            subjects.forEach(subject => {
                const element = this.createSubjectElement(subject);
                dayBody.appendChild(element);
            });

            column.appendChild(dayBody);
            container.appendChild(column);
        });
    }



    /**
     * Crea visualmente una materia.
     */
    createSubjectElement(subject) {

        const element =
            document.createElement("div");

        element.className =
            "subject";


        /*
         * Calculamos la posición vertical.
         *
         * Ejemplo:
         *
         * 06:00 -> 0px
         * 07:00 -> 60px
         * 08:00 -> 120px
         */
        const start =
            timeToMinutes(
                subject.startTime
            );

        const end =
            timeToMinutes(
                subject.endTime
            );


        const calendarStart =
            CONFIG.START_HOUR * 60;


        const top =
            (
                start -
                calendarStart
            ) / 60 *
            CONFIG.HOUR_HEIGHT;


        const height =
            (
                end -
                start
            ) / 60 *
            CONFIG.HOUR_HEIGHT;


        /*
         * El encabezado del día ocupa
         * aproximadamente 0px en nuestro
         * posicionamiento absoluto.
         */
        element.style.top =
            `${top}px`;

        element.style.height =
            `${height}px`;

        element.style.background =
            subject.color;


        /*
         * Información de la materia.
         */
        element.innerHTML = `

            <div class="subject-name">
                ${this.escapeHtml(subject.name)}
            </div>

            <div class="subject-info">

                🕐 ${subject.startTime}
                -
                ${subject.endTime}

                ${
                    subject.room
                    ? `<br>📍 ${this.escapeHtml(subject.room)}`
                    : ""
                }

                ${
                    subject.course
                    ? `<br>🎓 ${this.escapeHtml(subject.course)}`
                    : ""
                }

            </div>
        `;


        /*
         * Al tocar una materia,
         * abrimos su información.
         */
        element.addEventListener(
            "click",
            () => {

                this.openSubjectModal(
                    subject
                );

            }
        );


        return element;
    }


    /**
     * Evita insertar HTML directamente
     * cuando mostramos información escrita
     * por el usuario.
     */
    escapeHtml(text) {

        const div =
            document.createElement("div");

        div.textContent =
            text || "";

        return div.innerHTML;
    }


    /**
     * Abre el formulario de materia.
     */
    openSubjectModal(subject = null) {

        const form =
            this.elements.formMateria;


        form.reset();


        /*
         * Si existe una materia,
         * estamos editando.
         */
        if (subject) {

            document.getElementById(
                "tituloModalMateria"
            ).textContent =
                "Editar materia";


            document.getElementById(
                "materiaId"
            ).value =
                subject.id;


            document.getElementById(
                "nombreMateria"
            ).value =
                subject.name;


            document.getElementById(
                "cursoMateria"
            ).value =
                subject.course;


            document.getElementById(
                "profesorMateria"
            ).value =
                subject.professor;


            document.getElementById(
                "salonMateria"
            ).value =
                subject.room;


            document.getElementById(
                "diaMateria"
            ).value =
                subject.day;


            document.getElementById(
                "horaInicio"
            ).value =
                subject.startTime;


            document.getElementById(
                "horaFin"
            ).value =
                subject.endTime;


            document.getElementById(
                "colorMateria"
            ).value =
                subject.color;

        } else {

            document.getElementById(
                "tituloModalMateria"
            ).textContent =
                "Nueva materia";


            document.getElementById(
                "materiaId"
            ).value = "";


            document.getElementById(
                "colorMateria"
            ).value =
                "#4f46e5";
        }


        this.showModal(
            "modalMateria"
        );
    }


    /**
     * Abre el formulario de horario.
     */
    openScheduleModal() {

        this.elements.formHorario.reset();

        document.getElementById(
            "tituloModalHorario"
        ).textContent =
            "Nuevo horario";

        this.showModal(
            "modalHorario"
        );
    }


    /**
     * Muestra un modal.
     */
    showModal(id) {

        document
            .getElementById(id)
            .classList
            .remove("hidden");
    }


    /**
     * Oculta un modal.
     */
    closeModal(id) {

        document
            .getElementById(id)
            .classList
            .add("hidden");
    }
}


/* ================================================================
   CLASE APP
   ================================================================ */

/**
 * Clase principal de la aplicación.
 *
 * Es el punto donde se conectan:
 *
 * - StorageManager
 * - ScheduleManager
 * - UIManager
 */
class App {

    constructor() {

        this.storage =
            new StorageManager(
                CONFIG.STORAGE_KEY
            );


        this.scheduleManager =
            new ScheduleManager(
                this.storage
            );


        this.ui =
            new UIManager(this);
    }


    /**
     * Inicializa la aplicación.
     */
    init() {

        this.registerEvents();

        this.ui.render();
    }


    /**
     * Registra todos los eventos
     * de botones y formularios.
     */
    registerEvents() {


        /* --------------------------------------------------------
           NUEVO HORARIO
           -------------------------------------------------------- */

        document
            .getElementById(
                "btnNuevoHorario"
            )
            .addEventListener(
                "click",
                () => {

                    this.ui.openScheduleModal();

                }
            );


        /* --------------------------------------------------------
           CAMBIAR HORARIO
           -------------------------------------------------------- */

        document
            .getElementById(
                "selectorHorario"
            )
            .addEventListener(
                "change",
                event => {

                    this.scheduleManager
                        .selectSchedule(
                            event.target.value
                        );

                    this.ui.render();
                }
            );


        /* --------------------------------------------------------
           ELIMINAR HORARIO
           -------------------------------------------------------- */

        document
            .getElementById(
                "btnEliminarHorario"
            )
            .addEventListener(
                "click",
                () => {

                    this.deleteCurrentSchedule();

                }
            );


        /* --------------------------------------------------------
           AGREGAR MATERIA
           -------------------------------------------------------- */

        document
            .getElementById(
                "btnAgregarMateria"
            )
            .addEventListener(
                "click",
                () => {

                    if (
                        !this.scheduleManager
                            .getCurrentSchedule()
                    ) {

                        alert(
                            "Primero crea un horario."
                        );

                        return;
                    }

                    this.ui.openSubjectModal();

                }
            );


        /* --------------------------------------------------------
           FORMULARIO DE HORARIO
           -------------------------------------------------------- */

        document
            .getElementById(
                "formHorario"
            )
            .addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    this.saveSchedule();

                }
            );


        /* --------------------------------------------------------
           FORMULARIO DE MATERIA
           -------------------------------------------------------- */

        document
            .getElementById(
                "formMateria"
            )
            .addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    this.saveSubject();

                }
            );


        /* --------------------------------------------------------
           BOTONES DE CIERRE DE MODALES
           -------------------------------------------------------- */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modalId =
                            button.dataset.close;

                        this.ui.closeModal(
                            modalId
                        );

                    }
                );
            });


        /* --------------------------------------------------------
           CERRAR MODAL AL HACER CLICK FUERA
           -------------------------------------------------------- */

        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modal
                        ) {

                            modal.classList
                                .add("hidden");
                        }

                    }
                );
            });
    }


    /**
     * Guarda un nuevo horario.
     */
    saveSchedule() {

        const name =
            document.getElementById(
                "nombreNuevoHorario"
            ).value.trim();


        const description =
            document.getElementById(
                "descripcionNuevoHorario"
            ).value.trim();


        if (!name) {

            alert(
                "Escribe un nombre para el horario."
            );

            return;
        }


        this.scheduleManager
            .createSchedule(
                name,
                description
            );


        this.ui.closeModal(
            "modalHorario"
        );


        this.ui.render();
    }


    /**
     * Guarda una materia nueva o actualizada.
     */
    saveSubject() {

        const id =
            document.getElementById(
                "materiaId"
            ).value;


        const subject =
            new Subject({

                id:
                    id ||
                    generateId(),

                name:
                    document.getElementById(
                        "nombreMateria"
                    ).value.trim(),

                course:
                    document.getElementById(
                        "cursoMateria"
                    ).value.trim(),

                professor:
                    document.getElementById(
                        "profesorMateria"
                    ).value.trim(),

                room:
                    document.getElementById(
                        "salonMateria"
                    ).value.trim(),

                day:
                    document.getElementById(
                        "diaMateria"
                    ).value,

                startTime:
                    document.getElementById(
                        "horaInicio"
                    ).value,

                endTime:
                    document.getElementById(
                        "horaFin"
                    ).value,

                color:
                    document.getElementById(
                        "colorMateria"
                    ).value
            });


        /*
         * Validamos la materia.
         */
        if (!subject.isValid()) {

            alert(
                "Revisa el nombre y las horas de la materia."
            );

            return;
        }


        /*
         * Si existe ID estamos editando.
         */
        if (id) {

            this.scheduleManager
                .updateSubject(subject);

        } else {

            /*
             * De lo contrario es una materia nueva.
             */
            try {

                this.scheduleManager
                    .addSubject(subject);

            } catch (error) {

                alert(error.message);

                return;
            }
        }


        this.ui.closeModal(
            "modalMateria"
        );


        this.ui.render();
    }


    /**
     * Elimina el horario actualmente seleccionado.
     */
    deleteCurrentSchedule() {

        const schedule =
            this.scheduleManager
                .getCurrentSchedule();


        if (!schedule) {

            return;
        }


        const confirmation =
            confirm(
                `¿Seguro que quieres eliminar "${schedule.name}"?`
            );


        if (!confirmation) {

            return;
        }


        this.scheduleManager
            .deleteCurrentSchedule();


        this.ui.render();
    }
}


/* ================================================================
   INICIALIZACIÓN
   ================================================================ */

/**
 * Creamos una única instancia de la aplicación.
 */
const app =
    new App();


/**
 * Iniciamos cuando el HTML terminó de cargar.
 */
document.addEventListener(
    "DOMContentLoaded",
    () => {

        app.init();

    }
);