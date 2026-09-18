import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:9595/iasinventory";

const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
];

const STATUS_LABELS = {
  Pending: "Pendiente",
  Processing: "Procesando",
  Completed: "Completada",
  Cancelled: "Cancelada",
};

const STATUS_ICONS = {
  Pending: "◷",
  Processing: "↻",
  Completed: "✓",
  Cancelled: "×",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
  });

  const [orderForm, setOrderForm] = useState({
    productId: "",
    quantity: 1,
  });

  const [saving, setSaving] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, ordersResponse] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/orders`),
      ]);

      if (!productsResponse.ok || !ordersResponse.ok) {
        throw new Error("No se pudieron cargar los datos");
      }

      const productsData = await productsResponse.json();
      const ordersData = await ordersResponse.json();

      setProducts(productsData);
      setOrders(ordersData);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con la API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalStock = products.reduce(
      (sum, product) => sum + Number(product.stock || 0),
      0
    );

    const inventoryValue = products.reduce(
      (sum, product) =>
        sum +
        Number(product.price || 0) * Number(product.stock || 0),
      0
    );

    const lowStock = products.filter(
      (product) => Number(product.stock) <= 5
    ).length;

    const completedOrders = orders.filter(
      (order) => order.status === "Completed"
    ).length;

    return {
      products: products.length,
      totalStock,
      inventoryValue,
      lowStock,
      orders: orders.length,
      completedOrders,
    };
  }, [products, orders]);

  const orderStats = useMemo(() => {
    return ORDER_STATUSES.map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length,
    }));
  }, [orders]);

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      price: "",
      stock: "",
    });
    setShowProductModal(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
    });
    setShowProductModal(true);
  }

  async function saveProduct(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const body = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      };

      const url = editingProduct
        ? `${API_BASE}/products/${editingProduct.id}`
        : `${API_BASE}/products`;

      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar el producto");
      }

      setShowProductModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este producto?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar");
      }

      await fetchData();
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el producto.");
    }
  }

  function openCreateOrder() {
    setOrderForm({
      productId: products.length > 0 ? products[0].id : "",
      quantity: 1,
    });

    setShowOrderModal(true);
  }

  async function createOrder(event) {
    event.preventDefault();

    const product = products.find(
      (item) => item.id === Number(orderForm.productId)
    );

    const quantity = Number(orderForm.quantity);

    if (!product) {
      setError("Selecciona un producto.");
      return;
    }

    if (quantity <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    if (quantity > product.stock) {
      setError(`Solo hay ${product.stock} unidades disponibles.`);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: Number(orderForm.productId),
          quantity,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message);
      }

      setShowOrderModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la orden.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(id, status) {
    try {
      setError("");

      const response = await fetch(
        `${API_BASE}/orders/${id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado");
      }

      await fetchData();
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el estado.");
    }
  }

  const recentProducts = products.slice(-5).reverse();
  const recentOrders = orders.slice(-5).reverse();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-orb"></div>
        <h2>Cargando IAS Inventory</h2>
        <p>Preparando tu inventario...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-glow"></div>

        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <strong>IAS</strong>
            <span>Inventory</span>
          </div>
        </div>

        <div className="sidebar-label">MENU PRINCIPAL</div>

        <nav className="navigation">
          <button
            className={`nav-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "products" ? "active" : ""
            }`}
            onClick={() => setActivePage("products")}
          >
            <span className="nav-icon">▦</span>
            <span>Productos</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "orders" ? "active" : ""
            }`}
            onClick={() => setActivePage("orders")}
          >
            <span className="nav-icon">◇</span>
            <span>Órdenes</span>
          </button>
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-icon">⚡</div>
          <strong>API conectada</strong>
          <p>Todos los servicios están funcionando correctamente.</p>
          <div className="connection-line">
            <span></span>
            Sistema online
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-avatar">IA</div>
          <div>
            <strong>IAS Admin</strong>
            <span>Administrador</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">IAS Inventory / </span>
            <strong>
              {activePage === "dashboard"
                ? "Dashboard"
                : activePage === "products"
                ? "Productos"
                : "Órdenes"}
            </strong>
          </div>

          <button className="refresh-button" onClick={fetchData}>
            ↻ <span>Actualizar</span>
          </button>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert">
              <span>!</span>
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {activePage === "dashboard" && (
            <>
              <section className="hero-section">
                <div className="hero-decoration hero-decoration-one"></div>
                <div className="hero-decoration hero-decoration-two"></div>

                <div>
                  <span className="eyebrow">PANEL DE CONTROL</span>
                  <h1>¡Hola, Admin! 👋</h1>
                  <p>
                    Aquí tienes una vista general de lo que está pasando
                    con tu inventario.
                  </p>
                </div>

                <div className="hero-badge">
                  <span className="pulse"></span>
                  Sistema activo
                </div>
              </section>

              <section className="stats-grid">
                <StatCard
                  icon="▦"
                  title="Productos"
                  value={stats.products}
                  description="Productos registrados"
                  variant="purple"
                />

                <StatCard
                  icon="◈"
                  title="Stock total"
                  value={stats.totalStock}
                  description="Unidades disponibles"
                  variant="blue"
                />

                <StatCard
                  icon="$"
                  title="Valor inventario"
                  value={formatCurrency(stats.inventoryValue)}
                  description="Valor actual estimado"
                  variant="green"
                />

                <StatCard
                  icon="◇"
                  title="Órdenes"
                  value={stats.orders}
                  description={`${stats.completedOrders} completadas`}
                  variant="orange"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel chart-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">ACTIVIDAD</span>
                      <h2>Estado de las órdenes</h2>
                    </div>
                    <span className="panel-badge">
                      {orders.length} total
                    </span>
                  </div>

                  <div className="chart-area">
                    {orderStats.map((item) => {
                      const max = Math.max(
                        ...orderStats.map((x) => x.count),
                        1
                      );

                      const height =
                        item.count === 0
                          ? 8
                          : Math.max((item.count / max) * 100, 18);

                      return (
                        <div className="bar-wrapper" key={item.status}>
                          <div className="bar-value">{item.count}</div>

                          <div className="bar-track">
                            <div
                              className={`chart-bar bar-${item.status.toLowerCase()}`}
                              style={{
                                height: `${height}%`,
                              }}
                            ></div>
                          </div>

                          <span>
                            {STATUS_LABELS[item.status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">INVENTARIO</span>
                      <h2>Resumen de stock</h2>
                    </div>
                  </div>

                  <div className="inventory-summary">
                    <div className="stock-ring">
                      <div>
                        <strong>{stats.totalStock}</strong>
                        <span>unidades</span>
                      </div>
                    </div>

                    <div className="summary-items">
                      <div>
                        <span className="summary-dot normal"></span>
                        <div>
                          <strong>{products.length - stats.lowStock}</strong>
                          <span>Stock normal</span>
                        </div>
                      </div>

                      <div>
                        <span className="summary-dot warning"></span>
                        <div>
                          <strong>{stats.lowStock}</strong>
                          <span>Stock bajo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="panel-action"
                    onClick={() => setActivePage("products")}
                  >
                    Ver inventario completo →
                  </button>
                </div>
              </section>

              <section className="dashboard-grid">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">CATÁLOGO</span>
                      <h2>Productos recientes</h2>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setActivePage("products")}
                    >
                      Ver todos →
                    </button>
                  </div>

                  <div className="mini-list">
                    {recentProducts.length === 0 ? (
                      <EmptyState text="No hay productos registrados." />
                    ) : (
                      recentProducts.map((product) => (
                        <div className="mini-list-item" key={product.id}>
                          <div className="product-avatar">
                            {product.name?.charAt(0)?.toUpperCase() || "P"}
                          </div>

                          <div className="mini-list-info">
                            <strong>{product.name}</strong>
                            <span>{product.description}</span>
                          </div>

                          <div className="mini-list-value">
                            <strong>
                              {formatCurrency(product.price)}
                            </strong>
                            <span>{product.stock} unidades</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">MOVIMIENTOS</span>
                      <h2>Órdenes recientes</h2>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setActivePage("orders")}
                    >
                      Ver todas →
                    </button>
                  </div>

                  <div className="mini-list">
                    {recentOrders.length === 0 ? (
                      <EmptyState text="No hay órdenes registradas." />
                    ) : (
                      recentOrders.map((order) => (
                        <div className="mini-list-item" key={order.id}>
                          <div className="order-avatar">
                            {STATUS_ICONS[order.status] || "◇"}
                          </div>

                          <div className="mini-list-info">
                            <strong>Orden #{order.id}</strong>
                            <span>
                              {order.product?.name ||
                                `Producto #${order.productId}`}
                            </span>
                          </div>

                          <span
                            className={`status-badge status-${order.status.toLowerCase()}`}
                          >
                            {STATUS_LABELS[order.status] ||
                              order.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === "products" && (
            <section>
              <div className="page-title-row">
                <div>
                  <span className="eyebrow">INVENTARIO</span>
                  <h1>Productos</h1>
                  <p>Administra todos los productos de tu inventario.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={openCreateProduct}
                >
                  <span>＋</span> Nuevo producto
                </button>
              </div>

              <div className="panel table-panel">
                <div className="table-toolbar">
                  <div>
                    <strong>{products.length}</strong> productos registrados
                  </div>

                  <div className="toolbar-badge">
                    {stats.lowStock} con stock bajo
                  </div>
                </div>

                {products.length === 0 ? (
                  <EmptyState text="Todavía no hay productos." />
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Descripción</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div className="table-product">
                                <div className="product-avatar">
                                  {product.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "P"}
                                </div>
                                <div>
                                  <strong>{product.name}</strong>
                                  <span>#{product.id}</span>
                                </div>
                              </div>
                            </td>

                            <td>{product.description}</td>

                            <td>
                              <strong>
                                {formatCurrency(product.price)}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`stock-badge ${
                                  product.stock <= 5
                                    ? "stock-low"
                                    : "stock-ok"
                                }`}
                              >
                                {product.stock} unidades
                              </span>
                            </td>

                            <td>
                              <div className="action-buttons">
                                <button
                                  className="icon-button edit"
                                  onClick={() =>
                                    openEditProduct(product)
                                  }
                                  title="Editar"
                                >
                                  ✎
                                </button>

                                <button
                                  className="icon-button delete"
                                  onClick={() =>
                                    deleteProduct(product.id)
                                  }
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activePage === "orders" && (
            <section>
              <div className="page-title-row">
                <div>
                  <span className="eyebrow">OPERACIONES</span>
                  <h1>Órdenes</h1>
                  <p>Consulta y administra los pedidos realizados.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={openCreateOrder}
                  disabled={products.length === 0}
                >
                  <span>＋</span> Nueva orden
                </button>
              </div>

              <div className="order-stat-strip">
                {orderStats.map((item) => (
                  <div className="order-stat" key={item.status}>
                    <div
                      className={`order-stat-icon status-${item.status.toLowerCase()}`}
                    >
                      {STATUS_ICONS[item.status]}
                    </div>

                    <div>
                      <strong>{item.count}</strong>
                      <span>{STATUS_LABELS[item.status]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="panel table-panel">
                {orders.length === 0 ? (
                  <EmptyState text="Todavía no hay órdenes." />
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Orden</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Estado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <div className="order-id">
                                <div className="order-avatar">
                                  {STATUS_ICONS[order.status] || "◇"}
                                </div>
                                <strong>#{order.id}</strong>
                              </div>
                            </td>

                            <td>
                              <strong>
                                {order.product?.name ||
                                  `Producto #${order.productId}`}
                              </strong>
                            </td>

                            <td>
                              <span className="quantity-badge">
                                {order.quantity} unidades
                              </span>
                            </td>

                            <td>
                              <select
                                className={`status-select status-${order.status.toLowerCase()}`}
                                value={order.status}
                                onChange={(event) =>
                                  updateOrderStatus(
                                    order.id,
                                    event.target.value
                                  )
                                }
                              >
                                {ORDER_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {showProductModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowProductModal(false)}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-icon">▦</span>
                <div>
                  <span className="panel-kicker">
                    {editingProduct ? "EDITAR" : "NUEVO"}
                  </span>
                  <h2>
                    {editingProduct
                      ? "Editar producto"
                      : "Nuevo producto"}
                  </h2>
                </div>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowProductModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="form-grid">
                <label>
                  Nombre
                  <input
                    required
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="Ej. Teclado mecánico"
                  />
                </label>

                <label>
                  Descripción
                  <input
                    required
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="Descripción del producto"
                  />
                </label>

                <label>
                  Precio
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        price: event.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </label>

                <label>
                  Stock
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        stock: event.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowProductModal(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowOrderModal(false)}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-icon order-modal-icon">◇</span>
                <div>
                  <span className="panel-kicker">OPERACIÓN</span>
                  <h2>Nueva orden</h2>
                </div>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowOrderModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={createOrder}>
              <label>
                Producto
                <select
                  required
                  value={orderForm.productId}
                  onChange={(event) =>
                    setOrderForm({
                      ...orderForm,
                      productId: event.target.value,
                    })
                  }
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — {product.stock} disponibles
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Cantidad
                <input
                  required
                  type="number"
                  min="1"
                  value={orderForm.quantity}
                  onChange={(event) =>
                    setOrderForm({
                      ...orderForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </label>

              {(() => {
                const product = products.find(
                  (item) => item.id === Number(orderForm.productId)
                );

                if (!product) return null;

                return (
                  <div className="order-preview">
                    <div className="product-avatar">
                      {product.name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div>
                      <strong>{product.name}</strong>
                      <span>
                        Stock disponible: {product.stock}
                      </span>
                    </div>

                    <strong>
                      {formatCurrency(
                        Number(product.price) *
                          Number(orderForm.quantity || 0)
                      )}
                    </strong>
                  </div>
                );
              })()}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Creando..." : "Crear orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  variant,
}) {
  return (
    <div className={`stat-card stat-${variant}`}>
      <div className="stat-card-top">
        <div className="stat-icon">{icon}</div>
        <span className="stat-arrow">↗</span>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-description">{description}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <div>◇</div>
      <p>{text}</p>
    </div>
  );
}

export default App;