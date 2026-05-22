---
icon: right-to-bracket
---

# Login

Para utilizar las rutas de login es necesario permisos al usuario, los permisos se validan en el module "authMiddleware.js".\
Hasta ahora solo hay dos tipos de usuarios los cuales son Administrador y el usuario final siendo el ultimo el que contendra menos permisos de utilizar ciertas rutas de login.

## Middlewares:

Los middlewares los consulta los controllers y los Routes que ocupen credenciales o un login.

### requireAuth

* verifica que exista una sesión activa antes de continuar.
* Si no hay sesión, responde 401 y corta la cadena de middlewares.
* Usar en cualquier ruta que requiera login.

```javascript
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).json({ message: 'No autenticado. Inicia sesión.' });
  next();
};
```

### requireRole

* Permite el acceso solo a los roles indicados.
* Debe usarse después de requireAuth, ya que asume que req.session.usuario existe.

```javascript
const requireRole = (...roles) => (req, res, next) => {
  // Doble check de sesión por si se usa sin requireAuth
  if (!req.session?.usuario)
    return res.status(401).json({ message: 'No autenticado' });

  if (!roles.includes(req.session.usuario.rol))
    return res.status(403).json({ message: 'Sin permisos para esta acción' });

  next();
};
```

### Aplicados:

```javascript
//usuario final
router.post('/login',  ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);
router.get ('/me',     requireAuth, ctrl.me);

// Solo admin gestiona usuarios
router.post  ('/usuarios',              requireAuth, requireRole('admin'), ctrl.crearUsuario);
router.get   ('/usuarios',              requireAuth, requireRole('admin'), ctrl.listarUsuarios);
router.patch ('/usuarios/:id/password', requireAuth, requireRole('admin'), ctrl.cambiarPassword);
router.delete('/usuarios/:id',          requireAuth, requireRole('admin'), ctrl.eliminarUsuario);
};
```

## POST api/auth/usuarios (ADMIN)

Esta ruta se encarga de craer usuarios, solamente el admin tiene permiso en esta ruta.

### Referencia API

#### Module: crearUsuario

* Verifica en findByUsername que no haya un duplicado
* Crea un nuevo usuario hasheando su contraseña antes de guardarla.
* Solo debe ser llamado por un usuario con rol 'admin'.
* Encripta la contraseña ingresada

```javascript
const crearUsuario = async ({ nombre_usuario, password, rol, personal_id }) => {
  // Verificar duplicado antes de hashear para no gastar CPU innecesariamente
  const existe = await loginRepo.findByUsername(nombre_usuario);
  if (existe) throw { status: 409, message: 'El nombre de usuario ya existe' };

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = await loginRepo.createUsuario({ nombre_usuario, password_hash, rol, personal_id });
  return { id, nombre_usuario, rol };
```

#### Repository: findByUsername

* Busca un usuario por nombre de usuario incluyendo el nombre del personal vinculado.
* Usado durante el proceso de login para verificar credenciales.

```javascript
const findByUsername = async (nombre_usuario) => {
  const [rows] = await pool.execute(
    `SELECT u.*, p.nombre AS nombre_personal
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     WHERE u.nombre_usuario = ?`,
    [nombre_usuario]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Body

```json
{
  "nombre_usuario": "Gabriel",
  "password": "123",
  "rol":"admin",
  "personal_id":""
}
```

#### Response

```json
{
  "id": 1,
  "nombre_usuario": "Gabriel",
  "rol":"admin"
}
```

#### Error 409

```json
{
    "message": "El nombre de usuario ya existe"
}
```

#### Error 500

```json
{
    "message": "Bind parameters must not contain undefined. To pass SQL NULL specify JS null"
}
```

## POST api/auth/login

Esta ruta se encarga del login a la pagina, verifica las credenciales del usuario.

### Referencia API

#### Module: login

* Verifica las credenciales del usuario y retorna sus datos sin el hash de contraseña.
* Compara la contraseña encriptada por la ingresada.

```javascript
const login = async (nombre_usuario, password) => {
  const usuario = await loginRepo.findByUsername(nombre_usuario);

  // Mensaje genérico para no revelar si el usuario existe o no
  if (!usuario) throw { status: 401, message: 'Credenciales inválidas' };

  const match = await bcrypt.compare(password, usuario.password);
  if (!match) throw { status: 401, message: 'Credenciales inválidas' };

  // Excluir el hash de la respuesta antes de devolver al cliente
  const { password: _pwd, ...usuarioSafe } = usuario;
  return usuarioSafe;
};
```

#### Repository: findByUsername

* Busca un usuario por nombre de usuario incluyendo el nombre del personal vinculado.
* Usado durante el proceso de login para verificar credenciales.

```javascript
const findByUsername = async (nombre_usuario) => {
  const [rows] = await pool.execute(
    `SELECT u.*, p.nombre AS nombre_personal
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     WHERE u.nombre_usuario = ?`,
    [nombre_usuario]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Body

```json
{
  "nombre_usuario": "Gabriel",
  "password": "123"
}
```

#### Response

```json
{
  "message":"Sesión iniciada",
  "usuario":{
      "id": 1,
      "nombre_usuario": "Gabriel",
      "rol":"admin",
      "personal_id" null,
      "created_at": "2026-04- 29T16:34:31.000Z",
      "update_at": "2026-04- 29T16:34:31.000Z",
      "nombre_personal":null
  }
}
```

#### Error 400

```json
{
    "message": "Faltan credenciales"
}
```

#### Error 401

```json
{
    "message": "Credenciales invalidas"
}
```

## POST api/auth/logout

Esta ruta se encarga del cierre de sesión del usuario. Esta ruta solamente puede accederse por el front, para hacer esta prueba se tuvo que unir la ruta de login y logout, por eso pide un body, pero normalmente no lo pide.

### Referencia API

#### Module: logout

*   Destruye la sesión activa y limpia la cookie del cliente.

    ```javascript
    const logout = (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Sesión cerrada' });
    });
    };
    ```

### Endpoint

#### Body

```json
{
  "nombre_usuario": "Gabriel",
  "password": "123",
}
```

#### Response

```json
{
  "message": "Sesión cerrada"
}
```

## GET api/auth/me

Esta ruta obtiene la informacion del usuario ya una vez logeado. Esta ruta solamente puede accederse por el front, para hacer esta prueba se tuvo que unir la ruta de login y me, por eso pide un body, pero normalmente no lo pide.

### Referencia API

#### Repository: findById

* Busca un usuario por su ID. No retorna el hash de contraseña.
* Usado para recuperar datos de sesión activa.

```javascript
const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre_usuario, u.rol, u.personal_id,
            p.nombre AS nombre_personal
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};
```

### Endpoint

#### Body

```json
{
  "nombre_usuario": "Gabriel",
  "password": "123"
}
```

#### Response

```json
{
  "id": 1,
  "nombre_usuario": "Gabriel",
  "rol":"admin",
  "personal_id": null,
  "nombre_personal" null
}
```

#### Error 401

```json
{
    "message": "No autenticado. Inicia sesión."
}
```

## GET api/auth/usuarios (ADMIN)

Esta ruta obtiene todos los usuarios registrado, solamente el administrador puede utilizar esta ruta.

### Referencia API

#### Repository: getAllUsuarios

* Retorna todos los usuarios registrados sin incluir contraseñas.

```javascript
const getAllUsuarios = async () => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre_usuario, u.rol, u.personal_id,
            p.nombre AS nombre_personal, u.created_at
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     ORDER BY u.id`
  );
  return rows;
};
```

#### Response

```json
{
  "id":1,
  "nombre_usuario": "Gabriel",
  "rol": "admin",
  "personal_id": "1",
  "nombre_personal": "Gabriel",
  "create_at": "2026-04- 29T16:34:31.000Z"
},
{
  "id":2,
  "nombre_usuario": "Juanito",
  "rol": "admin",
  "personal_id": "2",
  "nombre_personal": "Juanito",
  "create_at": "2026-04- 29T16:34:31.000Z"
},
{
  "id":3,
  "nombre_usuario": "Pablo",
  "rol": "admin",
  "personal_id": "3",
  "nombre_personal": "Pablo",
  "create_at": "2026-04- 29T16:34:31.000Z"
},
{
  "id":4,
  "nombre_usuario": "Lucy",
  "rol": "Supervisor",
  "personal_id": "4",
  "nombre_personal": "Lucy",
  "create_at": "2026-04- 29T16:34:31.000Z"
}
```

## PATCH api/auth/usuarios/:id/password (ADMIN)

Esta ruta se encarga de cambiar la contraseña de un usuario, solamente un administrador puede utilizar esta ruta.

### Referencia API

#### Module: cambiarPassword

* Reemplaza la contraseña de un usuario con un nuevo hash.
* Envia la nueva contraseña al repositorio de querys en donde actualiza la contraseña

```javascript
const cambiarPassword = async (id, nueva_password) => {
  const password_hash = await bcrypt.hash(nueva_password, SALT_ROUNDS);
  const affected = await loginRepo.updatePassword(id, password_hash);
  if (!affected) throw { status: 404, message: 'Usuario no encontrado' };
};
```

### Endpoint

#### Params

* id: identificador del usuario

#### Body

```json
{
  "nueva_contraseña": "1234"
}
```

#### Response

```json
{
  "message": "Contraseña actualizada"
}
```

#### Error 404

```json
{
    "message": "Usuario no encontrado"
}
```

#### Error 400

```json
{
    "message": "Falta nueva_password"
}
```

## DELETE api/auth/usuarios/:id (ADMIN)

Esta ruta se encarga de borrar un usuario por id, esta ruta solo la puede utilizar el administrador.

### Endpoint

#### Params

* id: identificador del usuario

#### Response

```json
{
  "message": "Usuario eliminado"
}
```

#### Error 404

```json
{
    "message": "Usuario no encontrado"
}
```
