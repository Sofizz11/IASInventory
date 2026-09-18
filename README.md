IASInventory

IASInventory es un sistema de gestión de inventario y órdenes. Permite registrar productos, controlar cuánto stock queda de cada uno, y crear órdenes que descuentan automáticamente ese stock. Tiene un backend en ASP.NET Core que expone una API REST, y un frontend en React que consume esa API para mostrar un panel de administración.

Características principales
Alta, consulta, edición y eliminación de productos.
Control de stock por producto.
Creación de órdenes con validación de stock disponible y descuento automático al crearse.
Seguimiento del estado de cada orden (Pendiente, Procesando, Completada, Cancelada).
Panel visual (dashboard) con estadísticas de inventario y órdenes.
Documentación interactiva de la API con Swagger (en desarrollo).
Tecnologías
Área	Tecnología	Versión
Backend	C# / ASP.NET Core Web API	.NET 10
ORM	Entity Framework Core (Sqlite)	10.0.11
Base de datos	SQLite	—
Documentación de API	Swashbuckle (Swagger)	10.2.3
Frontend	React	19.2.8
Build del frontend	Vite	8.3.0
Linter del frontend	Oxlint	1.81.0
Testing	xUnit + EF Core Sqlite In-Memory	xunit 2.9.3
Control de versiones	Git / GitHub	—
Arquitectura
text
Usuario
   │
   ▼
Frontend (React + Vite, puerto 5173)
   │  fetch() a la API REST
   ▼
Backend ASP.NET Core (puerto 9595 en desarrollo)
   │
   ▼
Controllers (ProductsController, OrdersController)
   │
   ▼
Services (ProductService, OrderService)
   │
   ▼
Entity Framework Core (AppDbContext)
   │
   ▼
SQLite (iasinventory.db)

El frontend no llama directamente a la base de datos ni a los servicios: todo pasa por la API REST. Los Controllers reciben la petición HTTP y delegan la lógica de negocio (validaciones, descuento de stock, etc.) a los Services, que son los que hablan con la base de datos a través de Entity Framework Core.

Funcionalidades
Productos

El módulo de productos permite registrar nuevos productos con nombre, descripción, precio y cantidad en stock. También permite consultar todos los productos o uno en particular, modificar su información y eliminarlos cuando ya no se necesiten.

Nota: si un producto tiene órdenes asociadas, la base de datos no permite eliminarlo (la relación entre órdenes y productos está protegida). Si se intenta eliminar un producto en esa situación, la API actualmente no captura ese caso de forma amigable — ver la sección de Hallazgos.

Órdenes

El módulo de órdenes permite crear una orden indicando qué producto y qué cantidad se necesita. Antes de crearla, el sistema valida que el producto exista, que la cantidad sea mayor a cero, y que haya stock suficiente. Si todo está en orden, la orden se crea con estado "Pending" y el stock del producto se descuenta automáticamente, todo dentro de una misma transacción (si algo falla a mitad de camino, no queda ni la orden creada ni el stock descontado a medias).

El estado de una orden puede actualizarse después a Pending, Processing, Completed o Cancelled (sin distinguir mayúsculas/minúsculas al recibirlo).

Frontend

La interfaz web está organizada en tres vistas: un dashboard con estadísticas generales (productos registrados, stock total, valor estimado del inventario, órdenes por estado), una vista de productos con tabla y formularios para crear/editar, y una vista de órdenes donde se puede crear una nueva orden y cambiar el estado de las existentes desde un selector.

Requisitos
Para usar IASInventory (empresa / usuario final)

Actualmente, el repositorio no incluye un instalador ni una versión empaquetada. No existe todavía un archivo como IASInventory-Setup.exe. Esto significa que, hoy, usar IASInventory requiere seguir el proceso de desarrollo local descrito más abajo, con las herramientas de desarrollo instaladas. En la sección Instalación para la empresa se explica esto con más detalle y qué haría falta para llegar a una entrega sin herramientas técnicas.

Para desarrollar IASInventory
.NET 10 SDK
Node.js y npm (para el frontend)
Git
La herramienta dotnet-ef para manejar migraciones (no viene incluida con el SDK; se instala con dotnet tool install --global dotnet-ef)
Un editor o IDE compatible con .NET (Visual Studio, VS Code, Rider, etc.)
Instalación para la empresa

Hoy en día, esta sección no puede completarse tal como se pensó originalmente, porque el proyecto todavía no tiene un instalador ni una versión publicada. No hay un archivo .exe que la empresa pueda simplemente ejecutar.

Lo que sí se puede afirmar:

IASInventory usa SQLite como base de datos, lo que significa que los datos se guardan en un solo archivo (iasinventory.db) y no se necesita instalar un servidor de base de datos aparte. Cuando exista una versión instalable, esto va a simplificar bastante la instalación.
Cuando el equipo defina el proceso de publicación (ver sección Publicación), esta sección debe reescribirse con los pasos reales: qué archivo recibe la empresa, cómo se instala, dónde queda instalado, si crea acceso directo, etc.

Nota para desarrolladores: mientras no exista un instalador, cualquier entrega a la empresa tendría que hacerse corriendo el proyecto desde el código fuente, lo cual no es la idea final del producto.

Uso del sistema (entorno de desarrollo)

Con el backend y el frontend corriendo (ver Desarrollo local):

El backend queda disponible en http://localhost:9595 (perfil de desarrollo por defecto, ver Properties/launchSettings.json).
El frontend queda disponible en http://localhost:5173 (puerto por defecto de Vite).
Se abre el frontend en el navegador y desde ahí se administran productos y órdenes; el frontend se encarga de llamar a la API del backend.
Si el entorno es de desarrollo, la documentación interactiva de la API (Swagger) queda disponible sobre el backend, normalmente en /swagger.
API

Puerto base en desarrollo: http://localhost:9595 (perfil http de launchSettings.json, que es el que usa el frontend). Todas las rutas de la API cuelgan del prefijo /iasinventory.

Además, hay un endpoint simple de verificación:

text
GET /iasinventory

Responde { "message": "IASInventory API funcionando" }. Sirve para confirmar rápidamente que el backend está corriendo.

Productos — /iasinventory/products
Método	Ruta	Descripción
GET	/iasinventory/products	Lista todos los productos.
GET	/iasinventory/products/{id}	Consulta un producto por id. 404 si no existe.
POST	/iasinventory/products	Crea un producto.
PUT	/iasinventory/products/{id}	Actualiza un producto existente. 404 si no existe.
DELETE	/iasinventory/products/{id}	Elimina un producto. 404 si no existe.

Cuerpo esperado para crear/actualizar un producto:

json
{
  "name": "Teclado mecánico",
  "description": "Teclado mecánico RGB",
  "price": 120.50,
  "stock": 10
}

price no puede ser negativo y stock no puede ser negativo (validado con anotaciones de datos en el modelo Product; al usar [ApiController], ASP.NET Core valida esto automáticamente y devuelve 400 Bad Request sin que el controller tenga que revisarlo a mano).

Nota: a diferencia de las órdenes, crear un producto (POST) devuelve 200 OK en lugar de 201 Created. No es un error — solo es una diferencia de estilo entre los dos Controllers que vale la pena unificar en algún momento (ver Mejoras recomendadas).

Órdenes — /iasinventory/orders
Método	Ruta	Descripción
GET	/iasinventory/orders	Lista todas las órdenes, incluyendo el producto asociado.
GET	/iasinventory/orders/{id}	Consulta una orden por id. 400 si el id es ≤ 0, 404 si no existe.
POST	/iasinventory/orders	Crea una orden y descuenta stock.
PUT	/iasinventory/orders/{id}/status	Actualiza el estado de una orden.

Cuerpo esperado para crear una orden:

json
{
  "productId": 2,
  "quantity": 3
}

Respuestas posibles al crear una orden:

201 Created con la orden creada, si todo sale bien.
404 Not Found si el producto no existe.
400 Bad Request si la cantidad es menor o igual a 0.
409 Conflict si no hay suficiente stock.

Cuerpo esperado para actualizar el estado:

json
{
  "status": "Processing"
}

Los valores válidos de status son Pending, Processing, Completed y Cancelled (no distingue mayúsculas/minúsculas). Cualquier otro valor devuelve 400 Bad Request.

Swagger

Habilitado únicamente cuando el entorno es de Desarrollo (ASPNETCORE_ENVIRONMENT=Development), mediante AddSwaggerGen / UseSwagger / UseSwaggerUI. No hay una ruta personalizada configurada, así que aplica la convención por defecto de Swashbuckle (típicamente /swagger).

CORS

El backend solo acepta peticiones desde http://localhost:5173 (el origen por defecto de Vite en desarrollo). Si el frontend se sirve desde otra URL, hay que actualizar la política de CORS en Program.cs.

Base de datos
Motor: SQLite. Los datos viven en un solo archivo, iasinventory.db, en la raíz del proyecto backend. No hace falta instalar ni configurar un servidor de base de datos aparte.
Cómo se crea: el esquema se genera con migraciones de Entity Framework Core. No hay código en Program.cs que las aplique automáticamente al iniciar la aplicación (no hay Database.Migrate()), así que hay que aplicarlas manualmente con dotnet ef database update antes de usar el sistema por primera vez.
Migraciones existentes:
InitialCreate — crea la tabla Products.
AddOrders — crea la tabla Orders y la relación con Products.
Tablas: Products
Columna	Tipo en C#	Notas
Id	int	Clave primaria, autoincremental
Name	string	Obligatorio
Description	string	Obligatorio
Price	decimal(18,2)	No puede ser negativo
Stock	int	No puede ser negativo
Orders
Columna	Tipo en C#	Notas
Id	int	Clave primaria, autoincremental
ProductId	int	Llave foránea hacia Products.Id
Quantity	int	Debe ser mayor a 0
Status	string	Pending / Processing / Completed / Cancelled
La relación Orders → Products está configurada para no permitir borrar un producto si tiene órdenes asociadas (DeleteBehavior.Restrict).
Seed de datos: no existe. La aplicación arranca sin datos de ejemplo salvo que se hayan cargado manualmente (como en el archivo .db de ejemplo revisado, que tenía un producto y varias órdenes cargados a mano durante el desarrollo).
Solución de problemas

La aplicación no inicia. Confirmar que el SDK de .NET 10 esté instalado (dotnet --version) y que dotnet restore / dotnet build terminen sin errores.

El backend no responde en el puerto esperado. En desarrollo, el perfil por defecto (http) usa el puerto 9595, que es el que espera el frontend. Si se corre con el perfil https (dotnet run --launch-profile https), el puerto cambia a 5066 para HTTP — en ese caso el frontend no va a poder conectarse porque tiene el puerto 9595 fijo en su código (ver Hallazgos).

El navegador no puede conectarse desde el frontend. Verificar que el backend esté corriendo en http://localhost:9595 y que el frontend esté corriendo en http://localhost:5173 (la política de CORS solo permite ese origen).

La base de datos no aparece o las tablas no existen. Si es la primera vez que se corre el proyecto (o se clonó sin el archivo .db), hay que aplicar las migraciones manualmente con dotnet ef database update.

El puerto está ocupado. Cerrar el proceso que esté usando ese puerto, o cambiar el puerto en launchSettings.json.

El instalador no inicia. No aplica todavía: no existe un instalador construido para este proyecto (ver Instalación para la empresa).

Estructura del proyecto
text
IASInventory/
├── Controllers/
│   ├── ProductsController.cs
│   └── OrdersController.cs
├── Services/
│   ├── ProductService.cs
│   └── OrderService.cs
├── Models/
│   ├── Product.cs
│   ├── Order.cs
│   ├── CreateOrderRequest.cs
│   └── UpdateOrderStatusRequest.cs
├── Data/
│   └── AppDbContext.cs
├── Migrations/
│   ├── ..._InitialCreate.cs
│   └── ..._AddOrders.cs
├── Properties/
│   └── launchSettings.json
├── IASInventory.Tests/
│   ├── OrderServiceTests.cs
│   └── OrdersControllerTests.cs
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── IASInventory.csproj
├── IASInventory.http
└── .gitignore

El backend (Controllers, Services, Models, Data, Migrations) y el frontend (carpeta Frontend/) viven en el mismo repositorio, cada uno con su propio ciclo de compilación: el backend se compila con dotnet, el frontend con npm/vite.

El .gitignore del proyecto excluye bin/, obj/, archivos *.db, .vs/, .idea/, y dentro de Frontend/ excluye node_modules/ y dist/. Esto significa que el archivo de base de datos y las dependencias instaladas no viajan por Git — cada desarrollador genera los suyos localmente.

Desarrollo local
bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd IASInventory

# 2. Backend: restaurar y compilar
dotnet restore
dotnet build

# 3. Backend: preparar la base de datos (si iasinventory.db no existe)
dotnet ef database update

# 4. Backend: ejecutar
dotnet run
# queda disponible en http://localhost:9595

# 5. Frontend: en otra terminal
cd Frontend
npm install
npm run dev
# queda disponible en http://localhost:5173

Con ambos corriendo, se abre http://localhost:5173 en el navegador para usar el sistema.

Testing

El proyecto IASInventory.Tests usa xUnit y SQLite en memoria (Data Source=:memory:) para probar la lógica de OrderService y OrdersController sin necesidad de un archivo de base de datos real: valida, entre otras cosas, que crear una orden descuente el stock correctamente, que no se pueda crear una orden con stock insuficiente, y que actualizar el estado de una orden valide los valores permitidos.

Cobertura actual: las pruebas cubren únicamente OrderService y OrdersController. No hay pruebas para ProductService ni para ProductsController todavía.

bash
dotnet test
Git y GitHub

El proyecto se versiona con Git. El flujo normal de trabajo es el de siempre: clonar el repositorio, crear una rama para cada cambio, hacer commit y push, y abrir un pull request para revisión antes de integrar a la rama principal. El .gitignore ya está configurado para no subir archivos generados (compilados, dependencias de npm, la base de datos local, archivos de configuración del IDE).

Seguridad y configuración
Los archivos appsettings.json y appsettings.Development.json solo contienen configuración de logging (y AllowedHosts: "*" en el de producción). No hay cadenas de conexión, claves ni secretos expuestos en ellos.
AllowedHosts está en "*" (valor por defecto de la plantilla), lo cual conviene restringir antes de un despliegue real.
No hay autenticación ni autorización configurada: cualquiera que pueda llegar a la API puede usarla sin identificarse.
La política de CORS solo permite el origen http://localhost:5173, pensado para desarrollo local — hay que actualizarla cuando el frontend se despliegue en otra URL.
Publicación

No se encontraron perfiles de publicación ni scripts de dotnet publish en el repositorio. Antes de definir un proceso real de publicación conviene decidir:

Si el backend se publica dependiendo del runtime de .NET instalado en el equipo destino, o como self-contained (sin necesitar el runtime instalado).
Cómo se sirve el frontend ya compilado (npm run build genera una carpeta dist/) junto con el backend — hoy corren como dos procesos separados en desarrollo, y no hay configuración que los una en un solo paquete.
Qué pasa con el archivo iasinventory.db al publicar: si se incluye vacío, con datos de ejemplo, o se genera en el primer inicio (hoy no se genera automáticamente, así que esto habría que resolverlo antes de publicar).
Generación del instalador

No existe todavía ningún script de instalador (por ejemplo, un .iss de Inno Setup) en el repositorio. Esta sección queda pendiente hasta que el equipo defina y construya ese proceso, una vez esté resuelta la publicación.

Prueba en equipo limpio

Antes de entregar una versión a la empresa, se recomienda probarla en un computador sin el entorno de desarrollo instalado (sin SDK de .NET, sin Node.js, sin Git, sin IDE), para confirmar que realmente funciona de forma independiente. Hoy esto no aplica todavía porque no hay una versión publicada para probar — es un paso a incorporar una vez exista el proceso de publicación e instalador.

Checklist de entrega
text
[ ] El código compila sin errores (backend y frontend).
[ ] dotnet test pasa correctamente.
[ ] El backend responde en el puerto configurado.
[ ] El frontend se conecta correctamente al backend.
[ ] Swagger funciona en el entorno de desarrollo.
[ ] AllowedHosts está restringido (no "*") antes de producción.
[ ] Se evaluó agregar autenticación/autorización.
[ ] La política de CORS está actualizada para el entorno real.
[ ] No hay secretos expuestos en appsettings.
[ ] Existe un proceso de publicación definido.
[ ] Existe un instalador generado y probado en equipo limpio.
[ ] Se definió qué pasa con la base de datos al actualizar/desinstalar.
Soporte

No se encontró información de contacto ni canal de soporte en el repositorio. Debe definirla el equipo del proyecto.

Licencia

No se encontró archivo de licencia en el repositorio. Debe definirse antes de una entrega formal.

Mejoras recomendadas

Propuestas, no funcionalidades existentes hoy:

Manejar de forma explícita el error que ocurre al intentar eliminar un producto que tiene órdenes asociadas (hoy termina en un error sin manejar en lugar de un mensaje claro).
Definir un proceso de publicación e instalador para poder entregar una versión real a la empresa sin depender del entorno de desarrollo.
Agregar autenticación y autorización antes de exponer la API fuera de un entorno controlado.
Corregir la inconsistencia entre el puerto que usa IASInventory.http (5066, del perfil https) y el puerto que espera el frontend (9595, del perfil http), para evitar confusión al probar la API manualmente.
Aplicar las migraciones automáticamente al iniciar en desarrollo (por ejemplo, con Database.Migrate()), para no depender de un paso manual.
Restringir AllowedHosts y revisar la configuración de CORS antes de un despliegue real.
Agregar pruebas para ProductService y ProductsController (hoy solo existen para órdenes).
Unificar los códigos de respuesta HTTP entre los dos Controllers: ProductsController devuelve 200 OK al crear un producto, mientras que OrdersController devuelve 201 Created al crear una orden.
Actualizar el <title> del frontend (Frontend/index.html), que todavía tiene el valor por defecto iasinventory-frontend que genera Vite, en lugar de un nombre pensado para el usuario final.
Mover la URL de la API (http://localhost:9595/iasinventory, hoy escrita directamente en App.jsx) a una variable de entorno o archivo de configuración del frontend, para no tener que editar el código cada vez que cambie el entorno.
