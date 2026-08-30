"use strict";

/**
 * ============================================================
 * CONFIGURACIÓN DE SUPABASE
 * ============================================================
 *
 * Aquí debes colocar los datos de TU proyecto.
 */


/*
 * URL de tu proyecto Supabase.
 *
 * Ejemplo:
 *
 * https://abcdefgh.supabase.co
 */

const SUPABASE_URL =
    "https://ynosjrxxhyxiolmmrsxg.supabase.co";


/*
 * Clave pública de Supabase.
 *
 * Puede aparecer como:
 *
 * Publishable key
 *
 * o como:
 *
 * anon key
 */

const SUPABASE_KEY =
    "sb_publishable_xj61d4fjA8RBmxFG2UT0hg_3Zf7JblL";


/*
 * Cliente de Supabase.
 */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );