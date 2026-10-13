import { supabase } from "./supabase";

const cache = new Set();
let observer = null;
let timer = null;
let iniciado = false;

const slug = v =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const rota = () =>
  typeof window === "undefined"
    ? "/"
    : window.location.hash ||
      window.location.pathname ||
      "/";

const limparTexto = el =>
  String(
    el?.getAttribute?.("aria-label") ||
    el?.getAttribute?.("title") ||
    el?.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();

const obterRotaElemento = el => {
  try {
    if (el?.tagName === "A" && el.getAttribute("href")) {
      const a = document.createElement("a");
      a.href = el.getAttribute("href");
      return `${a.pathname || "/"}${a.search || ""}${a.hash || ""}`;
    }
  } catch {}

  return rota();
};

const obterPai = el => {
  if (!el) return null;

  const pai = el.closest(
    "[data-auto-menu][data-auto-mapa], [data-auto-submenu][data-auto-mapa]"
  );

  if (!pai || pai === el) return null;

  return pai.getAttribute("data-auto-mapa") || null;
};

const obterTipo = el => {
  if (el.hasAttribute("data-auto-menu")) return "menu";
  if (el.hasAttribute("data-auto-submenu")) return "submenu";

  const tag = String(el.tagName || "").toLowerCase();

  if (tag === "button") return "botao";
  if (tag === "a") return "link";

  return "botao";
};

const gravar = async dados => {
  if (!dados.length) return;

  const unicos = [
    ...new Map(
      dados
        .filter(x => x?.chave)
        .map(x => [x.chave, x])
    ).values()
  ];

  try {
    const { data, error } = await supabase
      .from("tabi_sistema_mapa_permissoes")
      .upsert(unicos, {
        onConflict: "chave"
      })
      .select();

    if (error) {
      console.error(
        "[AutoMapper] ERRO SUPABASE:",
        error
      );
      console.error(
        "[AutoMapper] MESSAGE:",
        error.message
      );
      console.error(
        "[AutoMapper] DETAILS:",
        error.details
      );
      console.error(
        "[AutoMapper] HINT:",
        error.hint
      );
      return;
    }

    unicos.forEach(x => cache.add(x.chave));

    console.log(
      "[AutoMapper] GRAVADO:",
      data
    );

  } catch (err) {
    console.error(
      "[AutoMapper] ERRO FATAL:",
      err
    );
  }
};

export async function registrarAutoMapa(
  isDesenvolvedor,
  grupo,
  tela,
  acoes = []
) {
  console.log("[AutoMapper] CHAMADO", {
    isDesenvolvedor,
    grupo,
    tela,
    acoes
  });

  if (!isDesenvolvedor) {
    console.log(
      "[AutoMapper] BLOQUEADO: usuário não é Desenvolvedor"
    );
    return;
  }

  const dados = [
    {
      chave: `${slug(tela)}.visivel`,
      grupo: String(grupo),
      tela: String(tela),
      nome: `Acessar Tela (${tela})`,
      tipo: "tela",
      rota: rota(),
      chave_pai: null,
      ordem: 0,
      ativo: true
    },

    ...(Array.isArray(acoes) ? acoes : [])
      .filter(a => a?.chave)
      .map((a, i) => ({
        chave: String(a.chave),
        grupo: String(a.grupo || grupo),
        tela: String(a.tela || tela),
        nome: String(a.nome || a.chave),
        tipo: String(a.tipo || "botao"),
        rota: String(a.rota || rota()),
        chave_pai: a.chave_pai
          ? String(a.chave_pai)
          : null,
        ordem: Number.isFinite(Number(a.ordem))
          ? Number(a.ordem)
          : i + 1,
        ativo: a.ativo !== false
      }))
  ];

  await gravar(dados);
}

/* =========================================================
   DESCOBERTA AUTOMÁTICA DO MENU DO DASHBOARD
   ========================================================= */

export async function registrarAutoMapaDOM(
  isDesenvolvedor,
  seletor = ".dashboard"
) {
  if (!isDesenvolvedor) {
    console.log(
      "[AutoMapper] DOM BLOQUEADO: usuário não é Desenvolvedor"
    );
    return;
  }

  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return;
  }

  const raiz = document.querySelector(seletor);

  if (!raiz) {
    console.log(
      "[AutoMapper] DOM: dashboard ainda não encontrado."
    );
    return;
  }

  const grupo =
    raiz.getAttribute("data-auto-grupo") ||
    "Sistema";

  const tela =
    raiz.getAttribute("data-auto-tela") ||
    "Dashboard";

  const elementos = [
    ...raiz.querySelectorAll(
      "[data-auto-mapa]"
    )
  ];

  if (!elementos.length) {
    console.log(
      "[AutoMapper] DOM: nenhum item encontrado."
    );
    return;
  }

  const dados = elementos.map((el, i) => {
    const chave =
      el.getAttribute("data-auto-mapa");

    const permissao =
      el.getAttribute("data-permissao") ||
      chave;

    const nome =
      limparTexto(el) ||
      chave;

    return {
      chave: String(permissao),
      grupo: String(
        el.getAttribute("data-auto-grupo") ||
        grupo
      ),
      tela: String(
        el.getAttribute("data-auto-tela") ||
        tela
      ),
      nome,
      tipo: obterTipo(el),
      rota: obterRotaElemento(el),
      chave_pai: obterPai(el),
      ordem: i + 1,
      ativo: true
    };
  });

  console.log(
    "[AutoMapper] DOM DESCOBERTO:",
    dados
  );

  await gravar(dados);
}

/* =========================================================
   OBSERVADOR AUTOMÁTICO
   ========================================================= */

export function iniciarAutoMapaDOM(
  isDesenvolvedor,
  seletor = ".dashboard"
) {
  if (!isDesenvolvedor) return;

  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return;
  }

  if (iniciado) return;

  iniciado = true;

  const executar = () => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      registrarAutoMapaDOM(
        isDesenvolvedor,
        seletor
      );
    }, 150);
  };

  executar();

  observer = new MutationObserver(() => {
    executar();
  });

  const raiz =
    document.querySelector(seletor) ||
    document.body;

  observer.observe(raiz, {
    childList: true,
    subtree: true
  });

  console.log(
    "[AutoMapper] OBSERVADOR DOM INICIADO"
  );
}

export function pararAutoMapaDOM() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  clearTimeout(timer);
  timer = null;
  iniciado = false;

  console.log(
    "[AutoMapper] OBSERVADOR DOM PARADO"
  );
}

export function limparCacheAutoMapa() {
  cache.clear();
}

export function usuarioEhDesenvolvedor() {
  try {
    const u = JSON.parse(
      localStorage.getItem(
        "usuario_logado"
      ) || "{}"
    );

    const perfil = String(
      u?.Perfil ||
      u?.perfil ||
      u?.perfil_nome ||
      ""
    )
      .trim()
      .toLowerCase();

    console.log(
      "[AutoMapper] PERFIL LOCAL:",
      perfil
    );

    return perfil === "desenvolvedor";

  } catch (e) {
    console.error(
      "[AutoMapper] ERRO AO LER USUÁRIO:",
      e
    );

    return false;
  }
}

export async function registrarAutoMapaAtual(
  grupo,
  tela,
  acoes = []
) {
  return registrarAutoMapa(
    usuarioEhDesenvolvedor(),
    grupo,
    tela,
    acoes
  );
}

export async function registrarAutoMapaDOMAtual(
  seletor = ".dashboard"
) {
  return registrarAutoMapaDOM(
    usuarioEhDesenvolvedor(),
    seletor
  );
}

export function iniciarAutoMapaDOMAtual(
  seletor = ".dashboard"
) {
  return iniciarAutoMapaDOM(
    usuarioEhDesenvolvedor(),
    seletor
  );
}