# 📚 Guía GitHub - DSS Ferroviaria Backend

## Paso 1: Crear Repositorio en GitHub

### 1.1 Acceder a GitHub

1. Ve a [github.com](https://github.com)
2. Inicia sesión (o crea cuenta gratuita)
3. Click en **"New repository"** (ícono +)

### 1.2 Configurar Repositorio

**Nombre del repositorio:**
```
sis321-ferroviaria-grupo1
```
(Cambiar `grupo1` por tu grupo real)

**Configuración:**
- [ ] Public (hacer accesible)
- [ ] Inicializar con README ✗ (ya tenemos uno)
- [ ] .gitignore → seleccionar **Node**
- [ ] License → seleccionar **MIT**

### 1.3 Crear Repositorio

Click en **Create repository**

---

## Paso 2: Configurar Git Localmente

### 2.1 Instalar Git

```bash
# Mac
brew install git

# Windows
# Descargar desde https://git-scm.com

# Linux
sudo apt-get install git
```

### 2.2 Configurar Identidad

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@example.com"

# Verificar
git config --global --list
```

### 2.3 Generar Clave SSH (Opcional pero recomendado)

```bash
ssh-keygen -t ed25519 -C "tu.email@example.com"
# Presionar Enter 3 veces (sin contraseña adicional)

# Copiar clave pública
cat ~/.ssh/id_ed25519.pub
```

**En GitHub:**
1. Settings → SSH and GPG keys
2. New SSH key
3. Pegar contenido de `id_ed25519.pub`
4. Guardar

---

## Paso 3: Clonar o Vincular Repositorio

### Opción A: Si es NUEVO (Desde GitHub)

```bash
git clone https://github.com/TU_USUARIO/sis321-ferroviaria-grupo1.git
cd sis321-ferroviaria-grupo1
```

### Opción B: Si YA existe localmente

```bash
cd dss-ferroviaria-backend

# Añadir remoto
git remote add origin https://github.com/TU_USUARIO/sis321-ferroviaria-grupo1.git

# O si usas SSH
git remote add origin git@github.com:TU_USUARIO/sis321-ferroviaria-grupo1.git

# Verificar
git remote -v
```

---

## Paso 4: Primer Commit (Subir Código)

```bash
# Iniciar git (si no lo hiciste)
git init

# Agregar todos los archivos
git add .

# Crear commit inicial
git commit -m "feat: inicializar proyecto backend con autenticación JWT"

# Subir a rama main
git branch -M main
git push -u origin main
```

---

## Paso 5: Workflow de Desarrollo

### 5.1 Crear Rama para Nueva Feature

```bash
# Bajarse cambios del remoto
git pull origin main

# Crear rama
git checkout -b feat/nombre-feature

# Ejemplo: Nueva feature de roles
git checkout -b feat/roles-administration
```

### 5.2 Hacer Cambios

```bash
# Ver estado
git status

# Ver cambios
git diff

# Agregar cambios
git add src/controllers/rolesController.js
git add src/models/Rol.js

# Hacer commit
git commit -m "feat: implementar controlador de roles"
```

### 5.3 Subir Cambios

```bash
# Subir rama
git push origin feat/roles-administration

# Github mostrará "Create a Pull Request"
```

### 5.4 Crear Pull Request (PR)

1. GitHub mostrará un botón **"Compare & pull request"**
2. Llenar descripción:
   ```
   ## Descripción
   Implementación del módulo de gestión de roles
   
   ## Cambios
   - Crear endpoints GET/POST/PUT/DELETE /roles
   - Añadir validaciones de permisos
   - Tests unitarios
   
   ## Pruebas
   - [ ] Testeado localmente
   - [ ] Postman collection actualizada
   ```
3. Click en **Create pull request**
4. Después de review, click en **Merge pull request**

### 5.5 Sincronizar Local

```bash
# Cambiar a main
git checkout main

# Bajarse cambios
git pull origin main

# Borrar rama local (opcional)
git branch -d feat/roles-administration
```

---

## 📝 Convención de Commits

### Formato

```
tipo(alcance): descripción

[cuerpo opcional]
[footer opcional]
```

### Tipos de Commits

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Reparación de error |
| `docs` | Cambios en documentación |
| `style` | Cambios de formato (sin código) |
| `refactor` | Reorganizar código (sin cambiar función) |
| `perf` | Mejora de performance |
| `test` | Agregar o actualizar tests |
| `chore` | Cambios en build, deps, config |

### Ejemplos

```bash
# Bueno ✅
git commit -m "feat(auth): implementar autenticación JWT con bcrypt"
git commit -m "fix(auth): resolver validación de password"
git commit -m "docs: actualizar guía de instalación"
git commit -m "refactor(db): optimizar queries de usuarios"

# Malo ❌
git commit -m "cambios"
git commit -m "arreglo rapido"
git commit -m "updates"
```

---

## 👥 Colaboración en Equipo

### Si trabajas CON OTROS

```bash
# Antes de empezar
git pull origin main

# Durante desarrollo
git add .
git commit -m "feat: ..."

# Antes de push
git pull origin feat/mi-rama  # Bajarse cambios del equipo

# Si hay conflictos
git status  # Ver conflictos
# Editar archivos manualmente
git add .
git commit -m "merge: resolver conflictos"

# Finalmente
git push origin feat/mi-rama
```

### Evitar Conflictos

1. **Comunicación:** Avisar al equipo qué archivos editas
2. **Pequeños commits:** Hacer commits frecuentes
3. **Pull frecuente:** `git pull origin main` antes de trabajar
4. **Ramas diferentes:** Cada persona en rama separada

---

## 📊 Útiles Comandos Git

```bash
# Ver historial
git log

# Ver cambios no committeados
git diff

# Deshacer cambios en archivo
git checkout -- src/index.js

# Ver ramas
git branch -a

# Renombrar rama
git branch -m nombre-viejo nombre-nuevo

# Eliminar rama remota
git push origin --delete nombre-rama

# Ver quién hizo cada línea
git blame src/index.js
```

---

## 🚀 GitHub Desktop (Alternativa Gráfica)

Si NO quieres usar terminal, usa **GitHub Desktop**:

1. Descargar → [desktop.github.com](https://desktop.github.com)
2. Login con cuenta GitHub
3. Clone repository
4. Hacer cambios en VS Code
5. En Desktop: escribir título + descripción
6. Click **Commit to main**
7. Click **Push origin**

---

## 📋 Checklist para Cada Commit

Antes de hacer `git push`:

- [ ] Código corre sin errores
- [ ] Tests pasan
- [ ] Variables de entorno NO están en código
- [ ] Mensaje de commit es descriptivo
- [ ] Cambios están relacionados (no mezclar features)
- [ ] Documentación actualizada (README, comments)
- [ ] Código sigue convenciones del proyecto

---

## 🔒 Proteger Información Sensible

### ❌ NUNCA commitear:

```
.env (variables de entorno)
.env.local
secrets.json
node_modules/ (ignorado por .gitignore)
*.log (logs)
passwords.txt
```

### ✅ Archivo `.gitignore` (YA incluido):

```
node_modules/
.env
.env.local
.DS_Store
*.log
dist/
build/
```

---

## 📈 Flujo Completo de Ejemplo

```bash
# 1. Clonar repo
git clone https://github.com/mi-usuario/sis321-ferroviaria.git
cd sis321-ferroviaria

# 2. Crear rama
git checkout -b feat/login-module

# 3. Instalar dependencias
npm install

# 4. Hacer cambios
nano src/index.js
npm start  # Probar

# 5. Agregar y commitear
git add .
git commit -m "feat: agregar endpoint POST /login"

# 6. Subir
git push origin feat/login-module

# 7. En GitHub: Create Pull Request → Merge

# 8. Volver a main
git checkout main
git pull origin main
```

---

## 🎯 Actividad 5 - Pasos de GitHub

1. **Crear repositorio** con nombre `sis321-ferroviaria-[grupo]`
2. **Clonar** en tu máquina
3. **Copiar** archivos de backend aquí
4. **Primer commit:** `feat: inicializar backend Node.js + Express + PostgreSQL`
5. **Segunda rama:** `feat: implementar autenticación JWT`
6. **PR + Merge**
7. **Documentar** en README

---

## 🆘 Ayuda

### Error: "fatal: not a git repository"

```bash
git init
git remote add origin https://github.com/tu-usuario/repo.git
```

### Error: "rejected - non-fast-forward"

```bash
git pull origin main
git push origin main
```

### Quiero deshacer el último commit

```bash
git reset --soft HEAD~1  # Deshacer pero mantener cambios
git reset --hard HEAD~1  # Deshacer todo (⚠️  cuidado)
```

---

**¡Felicidades! Ya estás listo para colaborar en GitHub.** 🎉

Para más info: [git-scm.com/doc](https://git-scm.com/doc)
