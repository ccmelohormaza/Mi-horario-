"use strict";

/**
 * ============================================================
 * MIS HORARIOS
 * ============================================================
 *
 * Aplicación de gestión de horarios.
 *
 * Arquitectura orientada a objetos:
 *
 * Subject
 *    ↓
 * Schedule
 *    ↓
 * SupabaseService
 *    ↓
 * ScheduleManager
 *    ↓
 * UIManager
 *    ↓
 * App
 *
 * Cada clase tiene una responsabilidad específica.
 */


/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

const CONFIG = {

    START_HOUR: 6,

    END_HOUR: 22,

    HOUR_HEIGHT: 60,

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

    ]
};


/* ============================================================
   UTILIDADES
   ============================================================ */

/**
 * Convierte HH:MM a minutos.
 */
function timeToMinutes(time) {

    const [hours, minutes] =
        time
            .substring(0, 5)
            .split(":")
            .map(Number);

    return (
        hours * 60 +
        minutes
    );
}


/**
 * Escapa HTML para evitar insertar código
 * introducido por el usuario.
 */
function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value || "";

    return div.innerHTML;
}


/* ============================================================
   MODELO SUBJECT
   ============================================================ */

class Subject {

    constructor(data = {}) {

        this.id =
            data.id || null;

        this.scheduleId =
            data.schedule_id ||
            data.scheduleId ||
            null;

        this.name =
            data.name || "";

        this.course =
            data.course || "";

        this.professor =
            data.professor || "";

        this.room =
            data.room ||
            data.salon ||
            "";

        this.day =
            data.day ||
            "lunes";

        this.startTime =
            data.start_time ||
            data.startTime ||
            "07:00";

        this.endTime =
            data.end_time ||
            data.endTime ||
            "08:00";

        this.color =
            data.color ||
            "#6366f1";
    }


    /**
     * Comprueba si la materia tiene información válida.
     */
    isValid() {

        if (
            !this.name.trim()
        ) {

            return false;
        }


        const start =
            timeToMinutes(
                this.startTime
            );


        const end =
            timeToMinutes(
                this.endTime
            );


        return end > start;
    }


    /**
     * Convierte el objeto a formato Supabase.
     */
    toDatabase() {

        return {

            schedule_id:
                this.scheduleId,

            name:
                this.name,

            course:
                this.course,

            professor:
                this.professor,

            room:
                this.room,

            day:
                this.day,

            start_time:
                this.startTime,

            end_time:
                this.endTime,

            color:
                this.color
        };
    }
}


/* ============================================================
   MODELO SCHEDULE
   ============================================================ */

class Schedule {

    constructor(data = {}) {

        this.id =
            data.id || null;

        this.ownerId =
            data.owner_id ||
            data.ownerId ||
            null;

        this.name =
            data.name || "";

        this.description =
            data.description || "";

        this.subjects =
            (data.subjects || [])
                .map(
                    subject =>
                        new Subject(subject)
                );
    }


    /**
     * Busca una materia.
     */
    findSubject(id) {

        return this.subjects.find(
            subject =>
                subject.id === id
        );
    }


    /**
     * Agrega una materia.
     */
    addSubject(subject) {

        this.subjects.push(subject);
    }


    /**
     * Actualiza una materia.
     */
    updateSubject(subject) {

        const index =
            this.subjects.findIndex(
                item =>
                    item.id === subject.id
            );


        if (index === -1) {

            return false;
        }


        this.subjects[index] =
            subject;

        return true;
    }


    /**
     * Elimina una materia localmente.
     */
    removeSubject(id) {

        this.subjects =
            this.subjects.filter(
                subject =>
                    subject.id !== id
            );
    }
}


/* ============================================================
   SERVICIO SUPABASE
   ============================================================ */

/**
 * Toda comunicación con la base de datos
 * está centralizada aquí.
 *
 * Esto es importante porque si posteriormente
 * cambiamos Supabase por otro backend,
 * no tendremos que modificar toda la aplicación.
 */
class SupabaseService {


    /* ========================================================
       AUTENTICACIÓN
       ======================================================== */

    async register(
        name,
        email,
        password
    ) {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signUp({

                email,

                password,

                options: {

                    data: {

                        name

                    }
                }
            });


        if (error) {

            throw error;
        }


        return data;
    }


    async login(
        email,
        password
    ) {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword({

                    email,

                    password
                });


        if (error) {

            throw error;
        }


        return data;
    }


    async logout() {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            throw error;
        }
    }


    async getCurrentUser() {

        const {
            data
        } =
            await supabaseClient.auth
                .getUser();


        return data.user;
    }


    /* ========================================================
       HORARIOS
       ======================================================== */


    /**
     * Obtiene los horarios del usuario.
     */
    async getSchedules() {

        const user =
            await this.getCurrentUser();


        if (!user) {

            return [];
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("schedules")
                .select(`
                    *,
                    subjects (*)
                `)
                .or(
                    `owner_id.eq.${user.id}`
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            throw error;
        }


        return data.map(
            schedule =>
                new Schedule(schedule)
        );
    }


    /**
     * Crea un horario.
     */
    async createSchedule(
        name,
        description
    ) {

        const user =
            await this.getCurrentUser();


        const {
            data,
            error
        } =
            await supabaseClient
                .from("schedules")
                .insert({

                    owner_id:
                        user.id,

                    name:
                        name,

                    description:
                        description

                })
                .select()
                .single();


        if (error) {

            throw error;
        }


        return new Schedule(data);
    }


    /**
     * Elimina un horario.
     *
     * Gracias a ON DELETE CASCADE,
     * sus materias también se eliminan.
     */
    async deleteSchedule(id) {

        const {
            error
        } =
            await supabaseClient
                .from("schedules")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;
        }
    }


    /* ========================================================
       MATERIAS
       ======================================================== */


    /**
     * Crea una materia.
     */
    async createSubject(subject) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("subjects")
                .insert(
                    subject.toDatabase()
                )
                .select()
                .single();


        if (error) {

            throw error;
        }


        return new Subject(data);
    }


    /**
     * Actualiza una materia.
     */
    async updateSubject(subject) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("subjects")
                .update(
                    subject.toDatabase()
                )
                .eq(
                    "id",
                    subject.id
                )
                .select()
                .single();


        if (error) {

            throw error;
        }


        return new Subject(data);
    }


    /**
     * Elimina una materia.
     */
    async deleteSubject(id) {

        const {
            error
        } =
            await supabaseClient
                .from("subjects")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;
        }
    }
}


/* ============================================================
   SCHEDULE MANAGER
   ============================================================ */

class ScheduleManager {

    constructor(service) {

        this.service =
            service;

        this.schedules =
            [];

        this.currentScheduleId =
            null;
    }


    /**
     * Carga todos los horarios.
     */
    async load() {

        this.schedules =
            await this.service
                .getSchedules();


        if (
            this.schedules.length > 0
        ) {

            this.currentScheduleId =
                this.schedules[0].id;

        } else {

            this.currentScheduleId =
                null;
        }
    }


    /**
     * Obtiene el horario actual.
     */
    getCurrentSchedule() {

        return this.schedules.find(
            schedule =>
                schedule.id ===
                this.currentScheduleId
        );
    }


    /**
     * Selecciona un horario.
     */
    select(id) {

        this.currentScheduleId =
            id;
    }


    /**
     * Crea un horario.
     */
    async create(
        name,
        description
    ) {

        const schedule =
            await this.service
                .createSchedule(
                    name,
                    description
                );


        this.schedules.push(
            schedule
        );


        this.currentScheduleId =
            schedule.id;


        return schedule;
    }


    /**
     * Elimina el horario actual.
     */
    async deleteCurrent() {

        const schedule =
            this.getCurrentSchedule();


        if (!schedule) {

            return;
        }


        await this.service
            .deleteSchedule(
                schedule.id
            );


        this.schedules =
            this.schedules.filter(
                item =>
                    item.id !==
                    schedule.id
            );


        this.currentScheduleId =
            this.schedules.length > 0
                ? this.schedules[0].id
                : null;
    }


    /**
     * Agrega una materia.
     */
    async addSubject(subject) {

        const schedule =
            this.getCurrentSchedule();


        if (!schedule) {

            throw new Error(
                "No existe un horario seleccionado."
            );
        }


        subject.scheduleId =
            schedule.id;


        const savedSubject =
            await this.service
                .createSubject(
                    subject
                );


        schedule.addSubject(
            savedSubject
        );


        return savedSubject;
    }


    /**
     * Actualiza una materia.
     */
    async updateSubject(subject) {

        const updated =
            await this.service
                .updateSubject(
                    subject
                );


        const schedule =
            this.getCurrentSchedule();


        schedule.updateSubject(
            updated
        );
    }


    /**
     * Elimina una materia.
     */
    async deleteSubject(id) {

        await this.service
            .deleteSubject(id);


        const schedule =
            this.getCurrentSchedule();


        schedule.removeSubject(
            id
        );
    }
}


/* ============================================================
   UI MANAGER
   ============================================================ */

class UIManager {

    constructor(app) {

        this.app =
            app;


        this.scheduleElement =
            document.getElementById(
                "schedule"
            );


        this.selector =
            document.getElementById(
                "selectorHorario"
            );
    }


    /**
     * Muestra la aplicación.
     */
    showApp() {

        document
            .getElementById(
                "authScreen"
            )
            .classList
            .add("hidden");


        document
            .getElementById(
                "appScreen"
            )
            .classList
            .remove("hidden");
    }


    /**
     * Muestra la autenticación.
     */
    showAuth() {

        document
            .getElementById(
                "authScreen"
            )
            .classList
            .remove("hidden");


        document
            .getElementById(
                "appScreen"
            )
            .classList
            .add("hidden");
    }


    /**
     * Renderiza toda la interfaz.
     */
    render() {

        this.renderSelector();

        this.renderInformation();

        this.renderCalendar();
    }


    /**
     * Renderiza el selector de horarios.
     */
    renderSelector() {

        this.selector.innerHTML =
            "";


        const schedules =
            this.app.scheduleManager
                .schedules;


        if (
            schedules.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.textContent =
                "No hay horarios";


            this.selector.appendChild(
                option
            );


            return;
        }


        schedules.forEach(
            schedule => {

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


                this.selector.appendChild(
                    option
                );
            }
        );
    }


    /**
     * Información del horario.
     */
    renderInformation() {

        const schedule =
            this.app.scheduleManager
                .getCurrentSchedule();


        const name =
            document.getElementById(
                "nombreHorario"
            );


        const description =
            document.getElementById(
                "descripcionHorario"
            );


        if (!schedule) {

            name.textContent =
                "Sin horario";


            description.textContent =
                "Crea tu primer horario.";


            return;
        }


        name.textContent =
            schedule.name;


        description.textContent =
            schedule.description ||
            "Sin descripción";
    }


    /**
     * Construye el calendario.
     */
    renderCalendar() {

        this.scheduleElement
            .innerHTML =
            "";


        const schedule =
            this.app.scheduleManager
                .getCurrentSchedule();


        if (!schedule) {

            this.scheduleElement
                .innerHTML = `

                    <div class="empty-state">

                        <h2>
                            📅 Sin horarios
                        </h2>

                        <p>
                            Crea tu primer horario.
                        </p>

                    </div>
                `;


            return;
        }


        /*
         * Columna de horas.
         */

        const timeColumn =
            document.createElement(
                "div"
            );


        timeColumn.className =
            "time-column";


        /*
         * Espacio superior.
         */

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "day-header";


        timeColumn.appendChild(
            empty
        );


        /*
         * Horas.
         */

        for (
            let hour =
                CONFIG.START_HOUR;

            hour <
                CONFIG.END_HOUR;

            hour++
        ) {

            const label =
                document.createElement(
                    "div"
                );


            label.className =
                "time-label";


            label.textContent =
                `${String(hour)
                    .padStart(2, "0")}:00`;


            timeColumn.appendChild(
                label
            );
        }


        this.scheduleElement
            .appendChild(
                timeColumn
            );


        /*
         * Días.
         */

        CONFIG.DAYS.forEach(
            day => {

                const column =
                    document.createElement(
                        "div"
                    );


                column.className =
                    "day-column";


                /*
                 * Cabecera.
                 */

                const header =
                    document.createElement(
                        "div"
                    );


                header.className =
                    "day-header";


                header.textContent =
                    day.name;


                column.appendChild(
                    header
                );


                /*
                 * Líneas horarias.
                 */

                for (
                    let hour =
                        CONFIG.START_HOUR;

                    hour <
                        CONFIG.END_HOUR;

                    hour++
                ) {

                    const line =
                        document.createElement(
                            "div"
                        );


                    line.className =
                        "hour-line";


                    column.appendChild(
                        line
                    );
                }


                /*
                 * Materias del día.
                 */

                schedule.subjects
                    .filter(
                        subject =>
                            subject.day ===
                            day.id
                    )
                    .forEach(
                        subject => {

                            column.appendChild(
                                this.createSubjectElement(
                                    subject
                                )
                            );
                        }
                    );


                this.scheduleElement
                    .appendChild(
                        column
                    );
            }
        );
    }


    /**
     * Crea la tarjeta visual de una materia.
     */
    createSubjectElement(subject) {

        const element =
            document.createElement(
                "div"
            );


        element.className =
            "subject";


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
            ) /
            60 *
            CONFIG.HOUR_HEIGHT;


        const height =
            (
                end -
                start
            ) /
            60 *
            CONFIG.HOUR_HEIGHT;


        element.style.top =
            `${top}px`;


        element.style.height =
            `${height}px`;


        element.style.background =
            subject.color;


        element.innerHTML = `

            <div class="subject-name">

                ${escapeHtml(
                    subject.name
                )}

            </div>


            <div class="subject-info">

                🕐
                ${subject.startTime}
                -
                ${subject.endTime}

                ${
                    subject.room

                    ? `<br>📍 ${
                        escapeHtml(
                            subject.room
                        )
                    }`

                    : ""
                }


                ${
                    subject.course

                    ? `<br>🎓 ${
                        escapeHtml(
                            subject.course
                        )
                    }`

                    : ""
                }

            </div>
        `;


        element.addEventListener(
            "click",
            () => {

                this.app.openSubjectEditor(
                    subject
                );

            }
        );


        return element;
    }


    /**
     * Abre el modal de materia.
     */
    openSubjectModal(
        subject = null
    ) {

        const form =
            document.getElementById(
                "formMateria"
            );


        form.reset();


        const id =
            document.getElementById(
                "materiaId"
            );


        if (subject) {

            document.getElementById(
                "tituloModalMateria"
            ).textContent =
                "Editar materia";


            id.value =
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


            id.value =
                "";


            document.getElementById(
                "colorMateria"
            ).value =
                "#6366f1";
        }


        this.openModal(
            "modalMateria"
        );
    }


    /**
     * Abre un modal.
     */
    openModal(id) {

        document
            .getElementById(id)
            .classList
            .remove("hidden");
    }


    /**
     * Cierra un modal.
     */
    closeModal(id) {

        document
            .getElementById(id)
            .classList
            .add("hidden");
    }


    /**
     * Muestra mensaje de autenticación.
     */
    showAuthMessage(
        message,
        isError = false
    ) {

        const element =
            document.getElementById(
                "authMessage"
            );


        element.textContent =
            message;


        element.className =
            isError
                ? "auth-message error"
                : "auth-message";
    }
}


/* ============================================================
   APP
   ============================================================ */

class App {

    constructor() {

        this.service =
            new SupabaseService();


        this.scheduleManager =
            new ScheduleManager(
                this.service
            );


        this.ui =
            new UIManager(this);


        this.currentUser =
            null;
    }


    /**
     * Inicializa la aplicación.
     */
    async init() {

        this.registerEvents();


        try {

            this.currentUser =
                await this.service
                    .getCurrentUser();


            if (
                this.currentUser
            ) {

                await this.startApplication();

            } else {

                this.ui.showAuth();
            }

        } catch (error) {

            console.error(error);

            this.ui.showAuth();
        }
    }


    /**
     * Inicia la aplicación después
     * de autenticarse.
     */
    async startApplication() {

        this.ui.showApp();


        const name =
            this.currentUser
                .user_metadata
                ?.name ||
            this.currentUser.email;


        document.getElementById(
            "userName"
        ).textContent =
            name;


        await this.scheduleManager
            .load();


        this.ui.render();
    }


    /**
     * Registra eventos.
     */
    registerEvents() {


        /* ======================================================
           REGISTRO
           ====================================================== */

        document
            .getElementById(
                "registerForm"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    try {

                        const name =
                            document
                                .getElementById(
                                    "registerName"
                                )
                                .value
                                .trim();


                        const email =
                            document
                                .getElementById(
                                    "registerEmail"
                                )
                                .value
                                .trim();


                        const password =
                            document
                                .getElementById(
                                    "registerPassword"
                                )
                                .value;


                        await this.service
                            .register(
                                name,
                                email,
                                password
                            );


                        this.ui
                            .showAuthMessage(
                                "Cuenta creada. Revisa tu correo si Supabase solicita confirmación."
                            );

                    } catch (error) {

                        this.ui
                            .showAuthMessage(
                                error.message,
                                true
                            );
                    }
                }
            );


        /* ======================================================
           LOGIN
           ====================================================== */

        document
            .getElementById(
                "loginForm"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    try {

                        const email =
                            document
                                .getElementById(
                                    "loginEmail"
                                )
                                .value
                                .trim();


                        const password =
                            document
                                .getElementById(
                                    "loginPassword"
                                )
                                .value;


                        const result =
                            await this.service
                                .login(
                                    email,
                                    password
                                );


                        this.currentUser =
                            result.user;


                        await this.startApplication();

                    } catch (error) {

                        this.ui
                            .showAuthMessage(
                                error.message,
                                true
                            );
                    }
                }
            );


        /* ======================================================
           CERRAR SESIÓN
           ====================================================== */

        document
            .getElementById(
                "btnLogout"
            )
            .addEventListener(
                "click",
                async () => {

                    await this.service
                        .logout();


                    this.currentUser =
                        null;


                    this.ui.showAuth();
                }
            );


        /* ======================================================
           NUEVO HORARIO
           ====================================================== */

        document
            .getElementById(
                "btnNuevoHorario"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "formHorario"
                        )
                        .reset();


                    this.ui.openModal(
                        "modalHorario"
                    );
                }
            );


        /* ======================================================
           CREAR HORARIO
           ====================================================== */

        document
            .getElementById(
                "formHorario"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    try {

                        const name =
                            document
                                .getElementById(
                                    "nombreNuevoHorario"
                                )
                                .value
                                .trim();


                        const description =
                            document
                                .getElementById(
                                    "descripcionNuevoHorario"
                                )
                                .value
                                .trim();


                        await this
                            .scheduleManager
                            .create(
                                name,
                                description
                            );


                        this.ui.closeModal(
                            "modalHorario"
                        );


                        this.ui.render();

                    } catch (error) {

                        alert(
                            error.message
                        );
                    }
                }
            );


        /* ======================================================
           CAMBIAR HORARIO
           ====================================================== */

        document
            .getElementById(
                "selectorHorario"
            )
            .addEventListener(
                "change",
                event => {

                    this.scheduleManager
                        .select(
                            event.target.value
                        );


                    this.ui.render();
                }
            );


        /* ======================================================
           ELIMINAR HORARIO
           ====================================================== */

        document
            .getElementById(
                "btnEliminarHorario"
            )
            .addEventListener(
                "click",
                async () => {

                    const schedule =
                        this.scheduleManager
                            .getCurrentSchedule();


                    if (!schedule) {

                        return;
                    }


                    const confirmation =
                        confirm(
                            `¿Eliminar "${schedule.name}"?`
                        );


                    if (!confirmation) {

                        return;
                    }


                    try {

                        await this
                            .scheduleManager
                            .deleteCurrent();


                        this.ui.render();

                    } catch (error) {

                        alert(
                            error.message
                        );
                    }
                }
            );


        /* ======================================================
           NUEVA MATERIA
           ====================================================== */

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


        /* ======================================================
           GUARDAR MATERIA
           ====================================================== */

        document
            .getElementById(
                "formMateria"
            )
            .addEventListener(
                "submit",
                async event => {

                    event.preventDefault();


                    try {

                        const id =
                            document
                                .getElementById(
                                    "materiaId"
                                )
                                .value;


                        const subject =
                            new Subject({

                                id:
                                    id || null,

                                name:
                                    document
                                        .getElementById(
                                            "nombreMateria"
                                        )
                                        .value
                                        .trim(),

                                course:
                                    document
                                        .getElementById(
                                            "cursoMateria"
                                        )
                                        .value
                                        .trim(),

                                professor:
                                    document
                                        .getElementById(
                                            "profesorMateria"
                                        )
                                        .value
                                        .trim(),

                                room:
                                    document
                                        .getElementById(
                                            "salonMateria"
                                        )
                                        .value
                                        .trim(),

                                day:
                                    document
                                        .getElementById(
                                            "diaMateria"
                                        )
                                        .value,

                                startTime:
                                    document
                                        .getElementById(
                                            "horaInicio"
                                        )
                                        .value,

                                endTime:
                                    document
                                        .getElementById(
                                            "horaFin"
                                        )
                                        .value,

                                color:
                                    document
                                        .getElementById(
                                            "colorMateria"
                                        )
                                        .value
                            });


                        if (
                            !subject.isValid()
                        ) {

                            alert(
                                "Revisa el nombre y las horas."
                            );

                            return;
                        }


                        if (id) {

                            await this
                                .scheduleManager
                                .updateSubject(
                                    subject
                                );

                        } else {

                            await this
                                .scheduleManager
                                .addSubject(
                                    subject
                                );
                        }


                        this.ui.closeModal(
                            "modalMateria"
                        );


                        this.ui.render();

                    } catch (error) {

                        console.error(
                            error
                        );


                        alert(
                            error.message
                        );
                    }
                }
            );


        /* ======================================================
           CERRAR MODALES
           ====================================================== */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            this.ui.closeModal(
                                button.dataset.close
                            );
                        }
                    );
                }
            );


        /* ======================================================
           CERRAR MODAL HACIENDO CLICK AFUERA
           ====================================================== */

        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(
                modal => {

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
                }
            );
    }


    /**
     * Abre editor de materia.
     */
    openSubjectEditor(subject) {

        this.ui.openSubjectModal(
            subject
        );


        /*
         * Por ahora el botón de eliminar
         * se puede implementar en la siguiente
         * iteración del modal.
         */
    }
}


/* ============================================================
   INICIAR
   ============================================================ */

const app =
    new App();


document.addEventListener(
    "DOMContentLoaded",
    () => {

        app.init();

    }
);