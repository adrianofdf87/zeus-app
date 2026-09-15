import React, { useState, useEffect } from "react";
import DataTable from "../../models/DataTable";
import { supabase } from "../../services/supabase";
import PermissoesTab from "./permissoes";
import { 
  Users, Shield, UserPlus, Edit3, Trash2, Lock, Unlock, RefreshCw 
} from "lucide-react";
import Swal from "sweetalert2";

export default function Usuarios() {
  const [dadosUsuarios, setDadosUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("usuarios"); // 'usuarios' | 'perfis'
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState(null);
  const [usuarioSelecionadoObj, setUsuarioSelecionadoObj] = useState(null);

  const sessaoUsuario = JSON.parse(localStorage.getItem("usuario_logado")) || {};
  const userIdKey = sessaoUsuario.id || sessaoUsuario.email || 'geral';

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from("tabi_cad_usuarios")
        .select('id, nome, email, "Telefone", "Perfil", situacao, "Usu_cad", "Data_cad"');

      if (error) throw error;
      setDadosUsuarios(data || []);
    } catch (err) {
      console.error("Erro detalhado ao carregar usuários:", err);
      Swal.fire("Erro no Supabase", err.message, "error");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleSelectionChange = (idsSelecionados) => {
    if (idsSelecionados.length === 1) {
      const id = idsSelecionados[0];
      setUsuarioSelecionadoId(id);
      const obj = dadosUsuarios.find(u => String(u.id) === String(id));
      setUsuarioSelecionadoObj(obj || null);
    } else {
      setUsuarioSelecionadoId(null);
      setUsuarioSelecionadoObj(null);
      if (abaAtiva === "perfis") {
        setAbaAtiva("usuarios"); // Se desmarcar o usuário, volta para a aba principal
      }
    }
  };

  const usuarioAtualBloqueado = () => {
    if (!usuarioSelecionadoObj) return false;
    return (usuarioSelecionadoObj.situacao || "").toUpperCase() === "BLOQUEADO";
  };

  const alternarBloqueioSelecionado = async () => {
    if (!usuarioSelecionadoId) return;
    try {
      setCarregando(true);
      const novaSituacao = usuarioAtualBloqueado() ? "ATIVO" : "BLOQUEADO";
      const { error } = await supabase.from("tabi_cad_usuarios").update({ situacao: novaSituacao }).eq("id", usuarioSelecionadoId);
      if (error) throw error;
      await carregarUsuarios();
      const objAtualizado = dadosUsuarios.find(u => String(u.id) === String(usuarioSelecionadoId));
      setUsuarioSelecionadoObj(objAtualizado);
    } catch (err) {
      Swal.fire("Erro", "Falha ao alterar situação: " + err.message, "error");
    } finally {
      setCarregando(false);
    }
  };

  const excluirSelecionado = async () => {
    if (!usuarioSelecionadoId) return;
    const confirm = await Swal.fire({ 
      title: "Deseja excluir?", 
      text: "Esta ação não poderá ser desfeita.", 
      icon: "warning", 
      showCancelButton: true, 
      confirmButtonColor: "#d93025", 
      confirmButtonText: "Sim, excluir", 
      cancelButtonText: "Cancelar" 
    });
    if (!confirm.isConfirmed) return;

    try {
      setCarregando(true);
      await supabase.from("tabi_cad_usuarios_permissoes").delete().eq("usuario_id", usuarioSelecionadoId);
      const { error } = await supabase.from("tabi_cad_usuarios").delete().eq("id", usuarioSelecionadoId);
      if (error) throw error;
      
      await Swal.fire({ icon: "success", title: "Excluído!", text: "Usuário excluído com sucesso.", confirmButtonColor: "#005596" });
      setUsuarioSelecionadoId(null);
      setUsuarioSelecionadoObj(null);
      carregarUsuarios();
    } catch (err) {
      Swal.fire("Erro", "Não foi possível excluir: " + err.message, "error");
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalNovoOuEditar = async (userId = null) => {
    const usuario = userId ? dadosUsuarios.find(u => u.id == userId) : { nome: "", email: "", Telefone: "", Perfil: "" };
    
    const { value: formValues } = await Swal.fire({
      title: '', width: '420px', padding: '0', background: '#ffffff',
      customClass: { popup: 'swal2-enterprise-modal', actions: 'swal2-custom-actions' },
      html: `
        <style>
          .swal2-enterprise-modal { border-radius: 12px !important; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; padding: 0 !important; }
          .swal2-custom-actions { margin: 0 !important; padding: 16px 20px 20px 20px !important; background: #f8fafc !important; border-top: 1px solid #f1f5f9 !important; display: flex !important; gap: 10px !important; width: 100% !important; box-sizing: border-box !important; }
          .swal2-confirm, .swal2-cancel { flex: 1 !important; margin: 0 !important; height: 38px !important; border-radius: 6px !important; font-size: 0.85rem !important; font-weight: 600 !important; }
          .swal2-confirm { background-color: #005596 !important; }
          .swal2-cancel { background-color: #fff !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; }
          .modal-header-pro { background: #f8fafc; padding: 18px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; text-align: left; }
          .modal-icon-box { background: #005596; color: #fff; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .modal-body-pro { padding: 20px; display: flex; flex-direction: column; gap: 12px; text-align: left; background: #fff; }
          .modal-field-group { display: flex; flex-direction: column; gap: 4px; }
          .modal-label-pro { font-size: 0.7rem; font-weight: 700; color: #64748b; letter-spacing: 0.04em; }
          .swal2-popup .swal2-input.modal-input-pro { margin: 0 !important; width: 100% !important; height: 36px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; padding: 0 10px !important; font-size: 0.83rem !important; background: #fff !important; box-sizing: border-box !important; color: #1e293b !important; box-shadow: none !important; }
          .modal-input-pro:focus { border-color: #005596 !important; outline: none; }
          .modal-input-pro:disabled { background-color: #f1f5f9 !important; color: #64748b !important; cursor: not-allowed; }
        </style>
        <div class="modal-header-pro">
          <div class="modal-icon-box"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg></div>
          <div>
            <h2 style="margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a;">${userId ? "Editar Usuário" : "Novo Usuário"}</h2>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">Preencha os dados do usuário.</p>
          </div>
        </div>
        <div class="modal-body-pro">
          <div class="modal-field-group">
            <label class="modal-label-pro">NOME COMPLETO</label>
            <input id="swal-nome" class="swal2-input modal-input-pro" placeholder="Nome completo" value="${usuario.nome || ''}" ${userId ? 'disabled' : ''}>
          </div>
          <div class="modal-field-group">
            <label class="modal-label-pro">E-MAIL</label>
            <input id="swal-email" class="swal2-input modal-input-pro" placeholder="exemplo@email.com" value="${usuario.email || ''}" ${userId ? 'disabled' : ''}>
          </div>
          <div class="modal-field-group">
            <label class="modal-label-pro">WHATSAPP</label>
            <input id="swal-telefone" class="swal2-input modal-input-pro" placeholder="(00) 00000-0000" value="${usuario.Telefone || ''}" maxlength="15">
          </div>
          <div class="modal-field-group">
            <label class="modal-label-pro">PERFIL</label>
            <select id="swal-perfil" class="swal2-input modal-input-pro" style="cursor: pointer;">
              <option value="" disabled selected>Selecione um perfil...</option>
              <option value="Desenvolvedor" ${usuario.Perfil === 'Desenvolvedor' ? 'selected' : ''}>Desenvolvedor</option>
              <option value="Gerente" ${usuario.Perfil === 'Gerente' ? 'selected' : ''}>Gerente</option>
              <option value="Personalizado" ${usuario.Perfil === 'Personalizado' ? 'selected' : ''}>Personalizado</option>
            </select>
          </div>
        </div>`,
      showCancelButton: true, confirmButtonText: "Salvar", cancelButtonText: "Cancelar",
      preConfirm: () => {
        const telefone = document.getElementById("swal-telefone").value.trim();
        const perfil = document.getElementById("swal-perfil").value;
        if (!telefone || !perfil) { Swal.showValidationMessage("Preencha todos os campos obrigatórios."); return false; }
        return userId ? { Telefone: telefone, Perfil: perfil } : { nome: document.getElementById("swal-nome").value.trim(), email: document.getElementById("swal-email").value.trim().toLowerCase(), Telefone: telefone, Perfil: perfil };
      }
    });

    if (!formValues) return;
    try {
      setCarregando(true);
      if (userId) {
        const { error } = await supabase.from("tabi_cad_usuarios").update(formValues).eq("id", userId);
        if (error) throw error;
      } else {
        const senhaPlana = Math.random().toString(36).slice(-8) + "A1@";
        const salt = dcodeIO.bcrypt.genSaltSync(10);
        const senhaHash = dcodeIO.bcrypt.hashSync(senhaPlana, salt);
        const usuarioLogadoNome = JSON.parse(localStorage.getItem("usuario_logado"))?.nome || "Sistema";

        const { error } = await supabase.from("tabi_cad_usuarios").insert([{ ...formValues, senha: senhaHash, senha_temporaria: true, situacao: "ATIVO", Usu_cad: usuarioLogadoNome }]);
        if (error) throw error;
      }
      carregarUsuarios();
      Swal.fire({ icon: "success", title: "Sucesso", text: "Dados salvos com sucesso.", timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Erro", "Erro ao salvar: " + err.message, "error");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "12px", padding: "0 10px", boxSizing: "border-box", overflow: "hidden" }}>
      
      {/* Abas Superiores (A aba de Perfis só aparece se houver usuário selecionado) */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e5e7eb", flexShrink: 0 }}>
        <button 
          style={{ background: "transparent", border: "none", padding: "8px 14px", fontSize: "0.9rem", fontWeight: "600", color: abaAtiva === 'usuarios' ? "#005596" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderBottom: abaAtiva === 'usuarios' ? "2px solid #005596" : "2px solid transparent", marginBottom: "-2px" }} 
          onClick={() => setAbaAtiva('usuarios')}
        >
          <Users size={18} /> Gestão de Usuários
        </button>
        {usuarioSelecionadoId && (
          <button 
            style={{ background: "transparent", border: "none", padding: "8px 14px", fontSize: "0.9rem", fontWeight: "600", color: abaAtiva === 'perfis' ? "#005596" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderBottom: abaAtiva === 'perfis' ? "2px solid #005596" : "2px solid transparent", marginBottom: "-2px" }} 
            onClick={() => setAbaAtiva('perfis')}
          >
            <Shield size={18} /> Perfis e Permissões
          </button>
        )}
      </div>

      {/* Conteúdo da Aba 1: Tabela */}
      <div style={{ display: abaAtiva === 'usuarios' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0, gap: '10px' }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <button onClick={() => abrirModalNovoOuEditar(null)} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <UserPlus size={16} /> Novo
          </button>
          <button onClick={() => abrirModalNovoOuEditar(usuarioSelecionadoId)} disabled={!usuarioSelecionadoId} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", cursor: usuarioSelecionadoId ? "pointer" : "not-allowed", opacity: usuarioSelecionadoId ? 1 : 0.4 }}>
            <Edit3 size={16} /> Editar
          </button>
          <button onClick={excluirSelecionado} disabled={!usuarioSelecionadoId} style={{ background: "#fff", color: usuarioSelecionadoId ? "#dc2626" : "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", cursor: usuarioSelecionadoId ? "pointer" : "not-allowed", opacity: usuarioSelecionadoId ? 1 : 0.4 }}>
            <Trash2 size={16} /> Excluir
          </button>
          <button onClick={alternarBloqueioSelecionado} disabled={!usuarioSelecionadoId} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", cursor: usuarioSelecionadoId ? "pointer" : "not-allowed", opacity: usuarioSelecionadoId ? 1 : 0.4 }}>
            {usuarioAtualBloqueado() ? <Unlock size={16} /> : <Lock size={16} />} 
            <span>{usuarioAtualBloqueado() ? "Desbloquear" : "Bloquear"}</span>
          </button>
          <button onClick={carregarUsuarios} title="Atualizar Tabela" style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "500", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>

        {carregando ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", color: "#64748b" }}>
            Carregando usuários...
          </div>
        ) : (
          <DataTable 
            data={dadosUsuarios} 
            tableId={`usuarios_${userIdKey}`} 
            onSelectionChange={handleSelectionChange} 
          />
        )}
      </div>

      {/* Conteúdo da Aba 2: Perfis e Permissões */}
      <div style={{ display: abaAtiva === 'perfis' && usuarioSelecionadoObj ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
        <PermissoesTab usuario={usuarioSelecionadoObj} />
      </div>

    </div>
  );
}