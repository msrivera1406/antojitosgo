"""Verificación manual de Gemini (spec 03). Dueño: Integrante 3.

Comprueba, para cada modelo configurado (principal y respaldos):
  1. VOZ:  que exista y soporte Live, que se pueda crear un token efímero y que una sesión Live responda.
  2. CHAT: que `generateContent` responda.
No imprime la clave. Uso (desde la raíz del proyecto):
    python scripts/ia_smoke.py            # todo
    python scripts/ia_smoke.py --solo-modelos   # solo lista y valida nombres, sin consumir cuota
"""
import asyncio
import datetime
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def cargar_env(ruta=".env"):
    """Lee .env sin depender de python-dotenv (no pisa variables ya definidas)."""
    if not os.path.exists(ruta):
        return
    for linea in open(ruta, encoding="utf-8"):
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            k, v = linea.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


cargar_env()
import config  # noqa: E402  (después de cargar el entorno)
from google import genai  # noqa: E402
from google.genai import types  # noqa: E402

CLAVE = config.GEMINI_API_KEY
INSTRUCCION = "Eres Antojito, un asistente amable de antojitos mexicanos. Responde en español mexicano, en una frase."


def limpiar(texto):
    """Quita la clave de cualquier mensaje antes de mostrarlo."""
    return str(texto).replace(CLAVE, "<clave>")[:220] if CLAVE else str(texto)[:220]


def listar_modelos():
    """Lista por REST. El SDK oculta algunos modelos (por ejemplo los Live), la API REST los devuelve todos."""
    import requests
    modelos, token = {}, None
    while True:
        params = {"pageSize": 200, **({"pageToken": token} if token else {})}
        r = requests.get("https://generativelanguage.googleapis.com/v1beta/models",
                         headers={"x-goog-api-key": CLAVE}, params=params, timeout=30)
        r.raise_for_status()
        datos = r.json()
        for m in datos.get("models", []):
            modelos[m["name"].replace("models/", "")] = m.get("supportedGenerationMethods", [])
        token = datos.get("nextPageToken")
        if not token:
            return modelos


async def probar_voz(modelo):
    cliente_v1beta = genai.Client(api_key=CLAVE, http_options={"api_version": "v1beta"})
    ahora = datetime.datetime.now(tz=datetime.timezone.utc)
    cfg_live = {"response_modalities": ["AUDIO"], "system_instruction": INSTRUCCION}
    token = cliente_v1beta.auth_tokens.create(config={
        "uses": 1,
        "expire_time": ahora + datetime.timedelta(minutes=5),
        "new_session_expire_time": ahora + datetime.timedelta(minutes=1),
        "live_connect_constraints": {"model": modelo, "config": cfg_live},
    })
    print(f"    token efímero creado (nombre con {len(token.name)} caracteres)")

    cliente_token = genai.Client(api_key=token.name, http_options={"api_version": "v1beta"})
    bytes_audio, texto = 0, ""
    t0 = time.time()
    async with cliente_token.aio.live.connect(model=modelo, config=types.LiveConnectConfig(**cfg_live)) as sesion:
        await sesion.send_client_content(
            turns=types.Content(role="user", parts=[types.Part(text="Hola, ¿qué me recomiendas para el frío?")]),
            turn_complete=True,
        )
        async for msg in sesion.receive():
            sc = msg.server_content
            if sc and sc.model_turn:
                for parte in sc.model_turn.parts or []:
                    if parte.inline_data and parte.inline_data.data:
                        bytes_audio += len(parte.inline_data.data)
            if sc and sc.turn_complete:
                break
            if time.time() - t0 > 25:
                break
    return bytes_audio, round(time.time() - t0, 1)


def probar_chat(cliente, modelo):
    t0 = time.time()
    r = cliente.models.generate_content(
        model=modelo,
        contents="Hola, ¿qué me recomiendas para el frío?",
        config=types.GenerateContentConfig(system_instruction=INSTRUCCION, max_output_tokens=200),
    )
    return (r.text or "").strip(), round(time.time() - t0, 1)


def main():
    solo_modelos = "--solo-modelos" in sys.argv
    if not CLAVE:
        sys.exit("Falta GEMINI_API_KEY en .env")
    cliente = genai.Client(api_key=CLAVE, http_options=types.HttpOptions(timeout=20000))  # 20 s por llamada
    disponibles = listar_modelos()
    voz = [m for m in [config.GEMINI_MODEL, *config.GEMINI_MODEL_FALLBACKS] if m]
    chat = [m for m in [config.GEMINI_CHAT_MODEL, *config.GEMINI_CHAT_MODEL_FALLBACKS] if m]
    resultados = []

    print("== VOZ (Live API) ==")
    for i, m in enumerate(voz):
        rol = "principal" if i == 0 else f"respaldo {i}"
        acciones = disponibles.get(m)
        if acciones is None:
            print(f"[X] {m} ({rol}): no existe para esta clave"); resultados.append(False); continue
        if "bidiGenerateContent" not in acciones:
            print(f"[X] {m} ({rol}): no soporta Live"); resultados.append(False); continue
        print(f"[ ] {m} ({rol}): existe y soporta Live")
        if solo_modelos:
            resultados.append(True); continue
        try:
            audio, seg = asyncio.run(probar_voz(m))
            ok = audio > 0
            print(f"    {'OK' if ok else 'SIN AUDIO'}: {audio} bytes de audio en {seg}s")
            resultados.append(ok)
        except Exception as e:  # noqa: BLE001
            print(f"    FALLO {type(e).__name__}: {limpiar(e)}"); resultados.append(False)

    print("\n== CHAT (generateContent) ==")
    for i, m in enumerate(chat):
        rol = "principal" if i == 0 else f"respaldo {i}"
        acciones = disponibles.get(m)
        if acciones is None or "generateContent" not in acciones:
            print(f"[X] {m} ({rol}): no disponible"); resultados.append(False); continue
        print(f"[ ] {m} ({rol}): existe")
        if solo_modelos:
            resultados.append(True); continue
        try:
            texto, seg = probar_chat(cliente, m)
            print(f"    OK en {seg}s: {limpiar(texto)[:120]!r}")
            resultados.append(bool(texto))
        except Exception as e:  # noqa: BLE001
            print(f"    FALLO {type(e).__name__}: {limpiar(e)}"); resultados.append(False)

    print("\nResultado:", "TODO OK" if all(resultados) else "HAY FALLOS (revisa arriba)")
    sys.exit(0 if all(resultados) else 1)


if __name__ == "__main__":
    main()
