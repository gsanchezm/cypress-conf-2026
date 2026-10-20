# Guion del ponente — Cypress Conf 2026

Este guion sigue, en orden, las 37 diapositivas de [la presentación](index.html). Los títulos visibles permanecen en inglés. El texto entre comillas es una propuesta de lo que puedes decir en español; adáptalo a tu voz. Los pasos operativos están al final para que puedas dejarlos abiertos en otra pantalla. Evita prometer una duración media: las slides ya no muestran estimaciones de tiempo.

## Preparación antes de abrir la presentación

1. Abre la presentación, [el mapa interactivo de agentes](agent-architecture.html), OmniPizza Web, la documentación OpenAPI, el proyecto de TestRail y [Cypress Cloud, proyecto 5v45hh](https://cloud.cypress.io/projects/5v45hh). Deja los enlaces cargados para que un cold start de Render no interrumpa la narración.
2. En el editor abre cypress/e2e/checkout/checkout.feature, src/features/checkout/steps/checkout.steps.ts, src/core/ui/AtomicScenario.ts, src/features/checkout/facade/CheckoutFacade.ts, src/features/checkout/prompts/checkout.prompt.md, AGENTS.md y agent/README.md. Usa zoom legible.
3. En una terminal ejecuta pnpm warmup y pnpm typecheck. Comprueba pnpm cloud:status; la Record Key graba pruebas, pero el CLI requiere autenticación aparte. Si no hay acceso al CLI, prepara la interfaz web de Cloud.
4. Oculta .env, credenciales, notificaciones y cualquier terminal que imprima secretos. Mantén separadas la terminal del runner, la de inspección y la ventana del navegador.
5. Ten a mano la evidencia histórica: [Cloud run 7](https://cloud.cypress.io/projects/5v45hh/runs/7), [Cloud run 8](https://cloud.cypress.io/projects/5v45hh/runs/8), TestRail R7 y el [run determinista de Actions](https://github.com/gsanchezm/cypress-conf-2026/actions/runs/39306055926). Estos registros corresponden a una ejecución anterior; no sustituyen la lectura del resultado de una corrida nueva.

## Acto 1 — problema y OmniPizza

### 01 · Title

**Di:** «En el universo de Linterna Verde, el anillo responde a la voluntad de quien lo usa. En pruebas pasa algo parecido: si no sabemos qué comportamiento queremos demostrar, ninguna automatización nos salva. Hoy voy a mostrar una arquitectura donde la API prepara el estado, la interfaz demuestra la experiencia y los agentes ayudan sin cambiar el oráculo».

**Señala:** El título y la idea de “atomic testing”. No empieces hablando de herramientas individuales; primero establece la promesa de un test con intención clara.

**Puente:** «Antes de ver código, les presento el sistema real que vamos a probar».

### 02 · Speaker

**Di:** «Soy Gilberto Sánchez, Mexitester. Trabajo con automatización y calidad de software. Preparé este proyecto para que todo lo que verán sea inspeccionable: el repositorio de Cypress, la aplicación bajo prueba y los resultados».

**Señala:** Tu nombre. Deja los enlaces para el cierre; el repositorio de esta charla aparecerá primero en la última slide.

### 03 · Agenda

**Di:** «Vamos a recorrer cuatro actos: primero conocer OmniPizza; después construir un escenario atómico; luego ver las reglas, los skills y los roles de agentes; por último vamos al demo con TestRail, cambios reales del DOM, Cypress Cloud y el pipeline. cy.prompt aparece dentro del demo porque es una estrategia de ejecución, no una charla aparte».

**Señala:** Las cuatro tarjetas en orden. No asignes minutos a las secciones.

### 04 · The Problem

**Di:** «Piensen en un test de Checkout que inicia sesión, navega por catálogo, agrega una pizza, visita carrito y finalmente llena el formulario. Si termina rojo, ¿qué se rompió? Podría ser la sesión, una pantalla anterior, un selector, el backend o el total. El camino completo oculta la causa».

**Haz:** Recorre verbalmente la secuencia de pantallas. Pregunta a la audiencia qué investigarían primero; usa su respuesta para introducir la necesidad de aislar el comportamiento.

### 05 · The Oath

**Di:** «El juramento es divertido, pero la idea técnica es seria: la precisión de un test viene de limitar lo que prepara, lo que ejecuta y lo que afirma. Si un escenario intenta demostrar todo el viaje de usuario, un solo rojo nos dice demasiado poco».

**Puente:** «Para no quedarnos en teoría, construí un producto con variaciones que sí desafían esta arquitectura».

### 06 · OmniPizza

**Di:** «OmniPizza es el sistema bajo prueba. Tiene frontend y API desplegados de forma independiente, documentación OpenAPI y cinco mercados. No uso una pantalla estática preparada sólo para que los tests se vean verdes: hay diferencias reales en campos, monedas y dirección de lectura».

**Haz:** Abre OmniPizza Web si ya cargó. Identifica el selector de mercado. Si la red no responde, usa las capturas de la slide y sigue; volverás al navegador en el demo.

### 07 · OmniPizza Desktop

**Di:** «Aquí aparece una restricción importante. El formulario de Checkout tiene datos de dirección, contacto y pago. Tras confirmar, la aplicación muestra el identificador y el total de la orden. Esa pantalla de éxito depende del estado generado por la acción real del usuario».

**Señala:** La pantalla de Checkout y la de confirmación. Advierte que un POST a la API seguido de una visita directa a /order-success no reconstruye ese estado en el navegador; volverás a esta limitación en la slide 17.

### 08 · OmniPizza Mobile + API

**Di:** «La vista móvil comparte el backend y las reglas de negocio. A la derecha está OpenAPI; los endpoints etiquetados “atomic test setup” permiten crear sesión o carrito por HTTP. Eso es lo que hace posible preparar el escenario sin repetir clics por pantallas que no estamos probando».

**Haz:** En Swagger muestra la etiqueta, no un token ni una respuesta con datos sensibles. Si abres la app móvil, menciona que México requiere colonia y Arabia Saudita distrito con interfaz RTL.

### 09 · System Architecture

**Di:** «Este es el sistema alrededor del sistema: GitHub Actions ejecuta Cypress; Cypress habla con la API y el navegador; TestRail recibe resultados cuando está configurado; Cloud recibe una corrida cuando decidimos grabarla. Si falla el pipeline determinista, otro workflow reúne evidencia y emite un veredicto sin llamar a un LLM».

**Señala:** Sigue las flechas de izquierda a derecha y luego la ruta separada de fallos. «Agente» aquí significa apoyo para inspección o reparación, no una dependencia para que el test corra.

## Acto 2 — cómo se construye un caso atómico

### 10 · Anatomy

**Di:** «Un test atómico tiene tres propiedades. Es pequeño porque demuestra un comportamiento; independiente porque no depende de que otro escenario haya pasado; y usa la API para el trabajo de preparación. El navegador se reserva para aquello que realmente queremos observar como usuario».

**Ejemplo:** «Si estoy probando el total en la confirmación de Checkout, no necesito volver a demostrar en ese mismo escenario que cada enlace del catálogo funciona».

### 11 · AtomicScenario

**Di:** «La regla deja de ser una recomendación y se vuelve estructura. AtomicScenario obliga a pasar por arrangeViaApi, hydrateUi y assertUi en ese orden. Primero preparo y verifico el contrato API; luego llevo el navegador al estado útil y hago la acción necesaria; al final leo lo renderizado».

**Haz:** Si alguien pregunta dónde se impone el orden, abre src/core/ui/AtomicScenario.ts y señala runAtomicSteps. Aclara que los detalles de cada slice viven en los steps y fachadas.

### 12 · Code: AtomicScenario

**Di:** «Este fragmento resume Checkout, pero el archivo real tiene más detalle. En arrangeViaApi se inicia sesión por API, se siembra el carrito y se coloca una orden API; su estado es el claim de contrato. Después hydrateUi inicia una sesión de UI y envía otro pedido usando el formulario real. Son dos órdenes distintas. Finalmente assertUi compara la confirmación renderizada con el total esperado derivado de la API».

**Señala:** Cada bloque del código en secuencia. No digas que el POST de la primera orden alimenta automáticamente la pantalla de éxito de la segunda.

### 13 · Assertion Budget

**Di:** «Nuestro presupuesto es máximo dos claims de negocio por escenario: uno del contrato API y uno de lo que la interfaz presenta. En Checkout, assertOrderCreated valida el estado de la orden creada por API; assertOrderConfirmation valida el resultado visible. Si quiero probar otra regla de negocio, creo otro caso».

**Haz:** En CheckoutFacade.ts muestra que el total positivo se trata como precondición y que la comparación visible se delega a la estrategia UI.

### 14 · Claims vs Guards

**Di:** «Un claim responde “¿hizo el producto lo correcto?”. Una precondición responde “¿existe el estado necesario para que esta prueba tenga sentido?”. Un guard espera a que el DOM esté listo. Si falla una precondición no anuncio un bug del total; si un guard reintenta visibilidad, tampoco estoy creando una tercera afirmación de negocio».

**Ejemplo:** El token no vacío permite continuar; no es el propósito del caso Checkout. La visibilidad de un campo permite interactuar; el total final sí es el comportamiento a demostrar.

### 15 · Hydration

**Di:** «Hidratar no significa inyectar siempre localStorage. Auth, Catalog y Checkout necesitan combinaciones distintas. Algunos estados se pueden crear con la API y visitar directamente; los estados de error requieren interfaz real; Checkout necesita un camino híbrido por la forma en que la app mantiene la confirmación».

**Señala:** Compara las slices sin convertir una técnica en dogma. El comportamiento del producto decide el límite.

### 16 · Checkout Hydration

**Di:** «Aquí está el camino híbrido: el test hace login por UI para entrar al mercado correcto, usa la API para preparar un carrito y deja que el navegador rehidrate su store. Desde allí llena dirección, campo regional y pago, y pulsa confirmar. La capacidad de retry de Cypress espera condiciones de DOM; no metemos un tiempo fijo inventado».

**Haz:** Con el diagrama, sigue cada caja hasta el submit. Señala dónde termina la preparación y dónde empieza el comportamiento que se quiere observar.

### 17 · Limits of Injection

**Di:** «Probamos el supuesto de hacer toda la orden por API y después visitar /order-success. El servidor sí crea una orden, pero esa pantalla no vuelve a consultar su detalle y el navegador no tiene el estado de confirmación: aparecen shell y datos vacíos. Por eso el envío del formulario es el tramo que no podemos atajar».

**Puente:** «Ya conocemos el límite. Ahora construyamos un caso desde el requisito hasta la aserción».

### 18 · Six-Level Case Ladder

**Di:** «Empiezo con México, @C9. Primer peldaño: Gherkin expresa la regla de negocio y el tag identifica el caso de TestRail. Segundo: checkout.steps.ts elige los datos del mercado. Tercero: AtomicScenario ordena fases. Cuarto: CheckoutFacade ejecuta acciones de dominio. Quinto: una estrategia decide cómo operar la UI. Sexto: los métodos assert conservan los dos claims».

**Haz:** Abre checkout.feature y señala la fila Mexico con @C9; luego navega a runCheckoutScenario en checkout.steps.ts. La etiqueta @C se usa para mapear el resultado al terminar; todavía no hay un lector get_case antes de ejecutar.

## Acto 3 — agentes, límites y skills

### 19 · Guardrails

**Di:** «AGENTS.md es el contrato compartido. Ahí están el presupuesto de claims, los archivos que son oráculo y los comandos de trabajo. guard-oracle puede bloquear un intento de cambiar un feature o una aserción; guard-bash puede bloquear comandos reservados. Los scripts son locales y deterministas. Para que bloqueen automáticamente, cada host debe conectarlos a sus hooks; Claude Code ya tiene esa conexión y otros asistentes pueden usar el mismo contrato».

**Haz:** Muestra AGENTS.md y scripts/hooks. No prometas que un asistente sin hooks configurados bloqueará una edición por sí solo.

### 20 · Agent Architecture

**Di:** «El mapa de Archify separa al humano, al asistente, a las reglas y al runner. Un agente puede leer skills, hacer triage o proponer un arreglo. Cypress sigue siendo quien ejecuta y determina el resultado. Más abajo aparece cy.prompt: es una estrategia dentro del test y usa Cloud, no el mismo agente que edita el repositorio».

**Haz:** Abre [el mapa interactivo](agent-architecture.html); sigue el camino central y después las ramas punteadas de roles, guard scripts y cy.prompt. Muestra que el diagrama enlaza sus componentes al código.

### 21 · Official Skills

**Di:** «Estos cinco skills no son cinco bots. Son instrucciones especializadas que el asistente puede consultar según el problema. cypress-tap ve el DOM de una sesión abierta; cloud-cli ve corridas y Replay; author ayuda a crear o reparar; explain explica sin editar; docs contrasta una duda con la documentación oficial».

**Haz:** Para cada tarjeta responde “cuándo”, “qué evidencia entrega” y “qué acción guía”. Los archivos SKILL.md se pueden leer desde cualquier asistente con acceso al repo, aunque Claude Code también los detecta mediante su adaptador.

### 22 · Skills vs cy.prompt

**Di:** «La diferencia está en quién recibe la instrucción y cuándo. Un skill se entrega al asistente que me ayuda a escribir o diagnosticar el framework. checkout.prompt.md contiene pasos para ejecutar en la interfaz. preparePrompt valida valores y cy.prompt los usa dentro de una corrida grabada. Ninguno reescribe el Gherkin ni decide por su cuenta el oráculo».

**Ejemplo:** «cypress-tap me ayuda a investigar por qué falla un selector; cy.prompt intenta realizar una acción de Checkout en el navegador». Deja claro que son capas distintas.

### 23 · Subagents and Graphify

**Di:** «Tenemos dos roles compartidos. cy-triage es de solo lectura y entrega un veredicto JSON sustentado por evidencia. cy-fixer puede tocar steps, estrategias o locators, pero trabaja un spec a la vez y se detiene tras cinco intentos. Graphify ayuda a encontrar dependencias sin leer manualmente cientos de archivos: el snapshot guardado tiene 634 nodos, 1,368 aristas y 24 comunidades».

**Haz:** Si hay tiempo, abre graphify-out/graph.html y busca SelectorSource, CountryCode y TestResult. No atribuyas estos números a un análisis recién ejecutado: describen el snapshot local.

## Acto 4 — demo en vivo y evidencia

### 24 · Demo Time

**Di:** «Ahora vamos a recorrer un caso concreto. Lo importante no es conseguir verde a cualquier precio: primero veremos qué se rompe, luego qué evidencia apunta al selector y por último qué mecanismo recupera el flujo. El feature y los claims permanecen intactos».

**Haz:** Cambia a una terminal limpia. Usa un caso @C9 para que la audiencia pueda seguirlo.

### 25 · Live Demo Route

**Di:** «Las cuatro escenas son: identificar el caso; cambiar realmente un atributo del DOM y usar el fallback; ver la estrategia cy.prompt y su corrida grabada; inspeccionar resultados en TestRail, Cloud y CI. El lector previo de TestRail y un gate de issues para regresiones confirmadas se presentarán al final como trabajo propuesto».

**Haz:** Anticipa qué pestañas abrirás. Sigue el [runbook](#runbook-del-demo) y vuelve a esta slide si necesitas reorientar al público.

### 26 · Two Strategies

**Di:** «La misma definición Gherkin puede usar dos motores UI. La estrategia determinista utiliza LocatorProxy, selectores y un fallback accesible opcional. La estrategia cy.prompt usa pasos en lenguaje natural contra la interfaz renderizada y se graba en Cloud. El step definition no necesita conocer el motor elegido».

**Haz:** Abre cypress/support/e2e.ts y muestra el switch UI_STRATEGY; no cambies el feature durante la demo.

### 27 · cy.prompt Basics

**Di:** «En Checkout agrupamos la acción de completar el pedido en una llamada y la verificación de confirmación en otra. Por eso una corrida de cinco mercados invoca hasta diez comandos cy.prompt antes de retries. La corrida grabada número 8 pasó los cinco mercados. Eso demuestra el flujo actual, no el healing de la mutación concreta que hicimos con el camino determinista».

**Haz:** Abre el run 8 en Cloud; señala los cinco tests y, si está disponible, una línea de tiempo de Test Replay.

### 28 · Prompts as Markdown

**Di:** «El texto de la interacción no está escondido en TypeScript. Aquí se ve el Markdown: una instrucción para dirección, un marcador para el campo regional y la acción de confirmar. Los valores variables usan dobles llaves, como {{address}}; el nombre del elemento al que apuntamos queda estático y cambia por mercado. preparePrompt detecta placeholders faltantes antes de la llamada».

**Haz:** Abre checkout.prompt.md y después CyPromptCheckoutUiStrategy.ts. Señala el marcador [requiredField] y cómo se inserta requiredFieldMX. No digas que existe hoy un test Node de presupuesto de prompt.

### 29 · Demo Backup: Commands

**Di:** «Estos son los dos comandos del experimento repetible. Primero renombro el data-testid del campo de dirección en el DOM vivo y el locator original falla. Después repito exactamente la mutación y habilito HEAL_LOCATORS=a11y. Así puedo atribuir la diferencia al fallback y no a que edité el registro de selectores».

**Haz:** Ejecuta los comandos secuencialmente desde el [runbook](#escena-2-mutacion-real-y-fallback). Espera el resultado completo de cada uno. Si el backend está frío, muestra la evidencia de respaldo y explica por qué un timeout no prueba selector drift.

### 30 · TestRail Bulk Reporting

**Di:** «TestRailObserver escucha after:run. Busca los tags @C del feature, crea un run, manda resultados mapeados en un lote y cierra el run: tres peticiones base para toda la suite. Si decidimos adjuntar screenshots de fallos, eso añade peticiones. Y si TestRail está caído, el error se registra sin convertir un test verde en rojo».

**Haz:** En TestRail muestra C9 y R7; si hiciste una corrida nueva con las variables configuradas, enseña ese nuevo run y di explícitamente que es distinto de R7.

### 31 · Cloud CLI

**Di:** «El humano y el agente pueden consultar corridas, tests, screenshots y Test Replay con cy-cloud. Pero la Record Key sólo sirve para grabar; el CLI necesita login o token propio. Si el estado de autenticación no está listo, la interfaz web de Cloud muestra la misma evidencia grabada sin fingir que el CLI ya funciona».

**Haz:** Ejecuta pnpm cloud:status. Si confirma autenticación, ejecuta pnpm cloud:runs; si no, abre el run 8 en la web.

### 32 · CI and Reporting

**Di:** «Un push o PR dispara tests.yml: typecheck, pruebas unitarias del triage y la matriz Auth, Catalog, Checkout. El workflow de cy.prompt sólo se lanza manualmente. Cuando falla la suite determinista, ci-triage.yml reúne logs y screenshots y produce JSON sin un proveedor LLM. Con evidencia suficiente de flake o cold start puede reintentar; en los demás casos comenta en PR o abre un issue con el veredicto».

**Señala:** La ruta de fallo del diagrama. Aclara que el issue gate que restringe publicaciones a regresiones de producto confirmadas todavía no existe.

### 33 · Demo Backup: Results

**Di:** «Si la red de la conferencia no ayuda, no necesito improvisar resultados. Tengo evidencia histórica: un run local grabado en Cloud pasó cinco Checkout y TestRail R7 cerró con cinco casos passed; otro run en Actions y Cloud también pasó los cinco mercados. Los identificadores en pantalla son comprobables, pero pertenecen a esa ejecución anterior».

**Haz:** Abre el enlace del run 8 y el run determinista. Evita decir “acabamos de ejecutar esto” si sólo estás mostrando un registro.

### 34 · What the Demo Proves

**Di:** «Quiero separar tres afirmaciones. Sí probamos el flujo API y UI de Checkout. Sí probamos que el fallback determinista tolera la mutación ensayada de data-testid. También sabemos que cy.prompt completó cinco mercados con la app actual. Todavía no hemos probado que cy.prompt repare esa mutación específica. Mantener esa frontera hace que la demo sea creíble».

**Haz:** Señala las columnas Proven y Not yet proven. Distingue cambiar el DOM de cambiar sólo el archivo de locators.

## Cierre

### 35 · Agentic Boundaries

**Di:** «Hoy están implementados los tags TestRail, el publicador de resultados, el runner Cypress, las corridas grabadas, el triage determinista y roles de agente reutilizables. Lo siguiente sería leer get_case antes de ejecutar, permitir una sola selección de escenario y publicar un bug únicamente si se reproduce una regresión de negocio, con evidencia y deduplicación. Esa secuencia completa es propuesta, no un workflow que ya pueda demostrar».

### 36 · Takeaways

**Di:** «Si se llevan cuatro cosas: la API prepara el estado; la UI demuestra lo que renderiza; cada escenario conserva un claim API y uno UI como máximo; y los agentes ayudan bajo reglas verificables. TestRail, Cloud, Graphify y CI nos dan evidencia para entender el fallo en vez de adivinar».

**Puente:** «El código y la app quedan abiertos para que ustedes mismos cuestionen estas decisiones».

### 37 · Thank You

**Di:** «Gracias. El primer enlace es el repositorio de esta charla; después está OmniPizza. Pueden revisar el caso C9, ejecutar la suite y explorar el diagrama interactivo. Me interesa especialmente discutir dónde pondrían ustedes el límite entre setup API y acción UI».

**Haz:** Deja visibles el repositorio, OmniPizza y tus datos de contacto. Abre preguntas.

## Runbook del demo

Los pasos siguientes son una guía de operación. Mantén el caso @C9 y no ejecutes dos corridas simultáneas contra la app compartida. Los comandos se ejecutan desde la raíz del repositorio en PowerShell. No muestres el contenido de .env en pantalla.

### Escena 1 — identidad del caso y ejecución base

1. En TestRail abre el caso C9. Di: «Este es el identificador del caso, no una instrucción dinámica para generar código».
2. En checkout.feature busca @C9, muestra la fila Mexico y lee Given, When y Then. En checkout.steps.ts enseña CHECKOUT_SCENARIOS.Mexico y runCheckoutScenario. En AtomicScenario.ts señala las tres fases.
3. Ejecuta un caso determinista sin cargar .env si sólo quieres ver Cypress. Si quieres que esta corrida publique un run real en TestRail, usa la segunda variante: las credenciales se cargan en el proceso Node y el observer actuará en after:run.

       pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --config 'retries=0'

       node --env-file=.env node_modules/cypress/bin/cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --config 'retries=0'

4. Espera el resumen. Di qué observaste, no lo que esperabas: caso pasado, fallado o precondición rota. Si hubo publicación TestRail, abre el run recién creado y verifica que C9 tenga el mismo estado. Si no la hubo, usa R7 como evidencia histórica, sin presentarla como resultado de esta corrida.

### Escena 2 — mutación real y fallback

1. Explica la hipótesis: «El registro de locators se queda igual; renombro en runtime el data-testid que muestra la app». Ejecuta la corrida roja:

       pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address' --config 'retries=0'

2. Espera a que termine. Muestra el error del locator en reporter o screenshot. Si el fallo fue de conexión o backend, no lo llames selector drift: revisa la URL y haz warmup antes de repetir.
3. Ejecuta la misma mutación con fallback accesible:

       pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y' --config 'retries=0'

4. Busca el selector alternativo único y el resultado final. Di: «La comparación controlada cambió únicamente HEAL_LOCATORS; el feature y la afirmación de negocio no cambiaron». Si falla por una causa distinta, detente en la evidencia y usa las capturas ensayadas.

### Escena 3 — cy.prompt y Cloud

1. Enseña el switch UI_STRATEGY en cypress/support/e2e.ts y los pasos de checkout.prompt.md. Explica que cy.prompt se ejecuta dentro de Cypress, usa Cloud y está separado del asistente que mantiene el repositorio.
2. Abre [Cloud run 8](https://cloud.cypress.io/projects/5v45hh/runs/8): enseña los cinco mercados, un test y su Replay. Este paso no consume cuota nueva.
3. Si decides grabar una corrida nueva y tienes acceso a Cloud, ejecuta un solo mercado. Este comando crea una corrida Cloud y, con TestRail configurado en .env, también puede crear un run TestRail:

       node --env-file=.env node_modules/cypress/bin/cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --expose 'UI_STRATEGY=cyPrompt' --record --config 'retries=0'

4. Espera el enlace de la nueva corrida y ábrelo. Si el servicio o la autenticación impiden grabar, vuelve a run 8. No presentes el run 8 como evidencia de healing de MUTATE_DOM: esa combinación concreta no se probó.

### Escena 4 — TestRail, CLI y pipeline

1. En TestRail abre R7 o el nuevo run de la escena 1/3. Señala el case ID, resultado y cierre del run. En código, enseña after:run → TestRailObserver → add_run → add_results_for_cases → close_run.
2. Ejecuta pnpm cloud:status. Sólo si está autenticado, ejecuta pnpm cloud:runs y abre un test o Replay con cy-cloud. Si no está autenticado, usa la pestaña web de Cloud; no confundas la Record Key con credenciales del CLI.
3. En GitHub Actions muestra tests.yml y después ci-triage.yml. Di: «Este segundo workflow sólo parte de una falla de la suite determinista y su diagnóstico base sale de logs, no de un LLM». Puedes enseñar una clasificación local sin escribir en GitHub:

       pnpm triage:verdict src/core/triage/fixtures/checkout-broken-locator.log

4. Lee category, confidence y evidence del JSON. Un patrón aislado no demuestra una regresión de producto. El workflow actual puede comentar o abrir issues para otras categorías; el gate de bug confirmado sigue en propuesta.

### Interludio opcional — guardrails, Graphify y cypress-tap

Este interludio encaja después de las slides 19–23. Hazlo sólo si las herramientas ya están abiertas; no es requisito para completar el flujo principal.

1. Abre AGENTS.md y muestra que el contrato compartido protege los .feature y los métodos assert. Para enseñar el guard sin editar ningún archivo, envía una propuesta ficticia de Edit a su entrada estándar:

       '{"tool_name":"Edit","tool_input":{"file_path":"cypress/e2e/auth/auth.feature","old_string":"a","new_string":"b"}}' | pnpm exec tsx scripts/hooks/guard-oracle.ts

   Espera una denegación con código de salida 2. Di: «El script recibe una intención de edición y la rechaza; aquí no se modificó ningún test». Recuerda que sólo bloquea automáticamente a un agente si el host lo invoca como hook.
2. Abre graphify-out/graph.html o ejecuta una consulta local:

       graphify query "CheckoutFacade TestRailObserver"

   Señala una dependencia que el mapa te ayude a encontrar. Si el CLI no está instalado en esa máquina, vuelve al mapa Archify de la slide 20 y explica que Graphify no participa en la ejecución de Cypress.
3. Si quieres mostrar cypress-tap, inicia manualmente pnpm cy:open y elige E2E en Chrome. Después consulta pnpm tap:status. Sólo con la sesión conectada despacha pnpm tap:run cypress/e2e/checkout/checkout.feature; inspecciona reporter, pin y dom para el comando que falló. No inicies una segunda corrida mientras la primera está en curso y no uses este camino para reescribir el oráculo.

## Rutas de rescate

| Si sucede | Haz | Explica |
| --- | --- | --- |
| Render responde lento o con 5xx | Ejecuta pnpm warmup, muestra capturas y vuelve a la evidencia guardada | Es infraestructura; no relajes el claim ni agregues esperas fijas |
| El caso C9 falla por una precondición | Identifica arrangeViaApi o el servicio inaccesible; no saltes directo al fallback | Un caso rojo todavía no identifica un bug de Checkout |
| No aparece un run nuevo en TestRail | Comprueba si la corrida cargó la configuración; muestra R7 como histórico | El observer es opt-in y no decide el resultado de Cypress |
| Cloud CLI no está autenticado | Abre run 8 en el navegador | La Record Key y la autenticación del CLI son distintas |
| No conviene gastar una ejecución cy.prompt en vivo | Muestra checkout.prompt.md, la estrategia y run 8 | La evidencia grabada ya demuestra el flujo de cinco mercados |
| Graphify o Archify no abre | Usa la imagen en la slide y sigue el camino verbal | Los diagramas apoyan la explicación; no ejecutan los tests |

## Preguntas que probablemente llegarán

- **«¿Puede ejecutarse con Codex, Copilot, DeepSeek o Claude Code?»** Sí: AGENTS.md, agent/roles y los comandos son compartidos. Cada host debe conectar los scripts de política si quiere bloqueo automático de operaciones.
- **«¿Por qué no usar cy.prompt para todo?»** La ruta determinista sigue siendo la opción base del proyecto. cy.prompt aporta interacción semántica opcional y evidencia grabada; no sustituye el contrato Gherkin.
- **«¿El agente puede arreglar un rojo cambiando el expected?»** Ese cambio toca el oráculo. El rol cy-fixer tiene permitido reparar la implementación del test, no suavizar la afirmación; guard-oracle lo bloquea cuando el host lo invoca.
- **«¿Tres requests incluyen screenshots?»** No. Son las tres llamadas base de TestRail para crear run, enviar resultados en bulk y cerrarlo. Adjuntar screenshots hace llamadas adicionales.
- **«¿El triage actual sólo crea issues para regresiones confirmadas?»** No. Ese gate es parte de la propuesta futura. Hoy el JSON y la evidencia ayudan a clasificar, pero el workflow todavía puede publicar otras categorías.

La fuente de verdad visual es [docs/index.html](index.html), generada desde presentation/deck/build.py y presentation/deck/deck-base.html. Este guion amplía sus notas; no modifica ni sustituye el contenido proyectado.
