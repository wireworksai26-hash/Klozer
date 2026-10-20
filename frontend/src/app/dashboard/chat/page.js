"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { leadFromApi } from "@/utils/mappers.mjs";
import Icon from "@/components/icons/Icon";
import { MessageSquareIcon } from "@/components/icons";
import { Modal } from "@/components/ui";
import Composer from "@/components/chat/Composer";
import ConversationHeader from "@/components/chat/ConversationHeader";
import ConversationList, { matchesFilter } from "@/components/chat/ConversationList";
import CustomerDetail from "@/components/chat/CustomerDetail";
import MessageBubble from "@/components/chat/MessageBubble";
import { ModalGuardContext } from "@/components/chat/ModalGuard";
import QrisModal from "@/components/chat/QrisModal";

// What the server says about a conversation's channel, hand-off, agent and consent can change while the thread is open
// (a hand-off note arrives, a colleague moves the chat). When the thread's own answer differs from the list, the list is refetched.
const LIVE_FIELDS = ["channelType", "handledBy", "handoffReason", "aiAgentId", "aiAgentPinned", "marketingConsent", "followupOptOut", "csDbId"];

export default function ChatPage() {
  const { leads, refreshLeads, chatEvent, notify, isManager, t } = useDashboard();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showContactList, setShowContactList] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [showQris, setShowQris] = useState(false);
  // an AI reply being edited to be sent as the person's own, and whether the assistant should learn the edit
  const [editing, setEditing] = useState(null);
  const [learn, setLearn] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const bottomRef = useRef(null);
  const leadsRef = useRef(leads);
  const nested = useRef(0);

  const selected = leads.find((l) => l.dbId === selectedId) || null;

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  const loadMessages = useCallback(
    async (leadId, { quiet = false } = {}) => {
      if (!quiet) setLoadingMessages(true);
      try {
        const res = await api.get(`/chats/${leadId}`);
        setMessages(res.data.messages);
        const known = leadsRef.current.find((l) => l.dbId === leadId);
        const fresh = res.data.lead ? leadFromApi(res.data.lead) : null;
        if (known && fresh && LIVE_FIELDS.some((k) => known[k] !== fresh[k])) refreshLeads().catch(() => {});
      } catch (err) {
        notify("error", err.message);
      } finally {
        setLoadingMessages(false);
      }
    },
    [notify, refreshLeads]
  );

  // A link from elsewhere opens that customer's chat: /dashboard/chat?lead=12. An id that is not among the loaded leads is ignored.
  const leadParam = Number(useSearchParams().get("lead")) || null;
  const openedFromLink = useRef(null);
  useEffect(() => {
    if (!leadParam || openedFromLink.current === leadParam || !leads.some((l) => l.dbId === leadParam)) return;
    openedFromLink.current = leadParam;
    setSelectedId(leadParam);
    setShowContactList(false);
  }, [leadParam, leads]);

  // Open a conversation: fetch its history.
  useEffect(() => {
    if (!selectedId) return;
    // Resetting the thread is part of switching conversations, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // A message arrived over the socket: refresh the open thread, and the list if the contact is new.
  useEffect(() => {
    if (!chatEvent) return;
    // Reacting to an external (socket) event by refetching is what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chatEvent.leadId === selectedId) loadMessages(selectedId, { quiet: true });
    if (!leads.some((l) => l.dbId === chatEvent.leadId)) refreshLeads().catch(() => {});
    // leads is intentionally not a dependency: only a new event should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatEvent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => matchesFilter(l, filter) && (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q)));
  }, [leads, search, filter]);

  const send = async (text, extra = {}) => {
    if (!selectedId || !text.trim()) return false;
    setSending(true);
    try {
      const res = await api.post("/chats/send", { lead_id: selectedId, content_text: text.trim(), ...extra });
      setMessages((prev) => [...prev, res.data]);
      // 202: stored, but the channel did not accept it. Say so instead of looking like success.
      if (res.success === false) {
        notify("error", res.message);
        return false;
      }
      return true;
    } catch (err) {
      notify("error", err.message);
      loadMessages(selectedId, { quiet: true });
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText;
    const edit = editing;
    setInputText("");
    setEditing(null);
    const sent = await send(text, edit ? { edited_from_message_id: edit.id, learn: edit.canLearn && learn ? true : undefined } : {});
    if (!sent) setInputText(text); // nothing is lost when sending fails
  };

  const startEdit = (message) => {
    setEditing({ id: message.id, canLearn: isManager && message.reply_path == null });
    setLearn(false);
    setInputText(message.content_text || "");
  };
  const cancelEdit = () => {
    setEditing(null);
    setInputText("");
  };

  /** The assistant drafts a reply into the box. Nothing is sent: the person reads it, edits it and sends it. */
  const suggest = async () => {
    if (!selectedId) return;
    setSuggesting(true);
    try {
      const res = await api.post(`/chats/${selectedId}/suggest`);
      setEditing(null);
      setInputText(res.data.draft);
      notify("success", res.data.needsPerson ? t("Draf siap. AI menilai pesan ini sebaiknya ditangani tim, baca dulu sebelum mengirim.") : t("Draf siap. Baca dan edit dulu sebelum mengirim."));
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const selectConversation = (id) => {
    setEditing(null);
    setInputText("");
    setSelectedId(id);
    setShowContactList(false);
  };
  const closeQris = useCallback(() => setShowQris(false), []);
  // a dialog opened inside the drawer closes on its own Escape and leaves the drawer open
  const guard = useMemo(() => ({ enter: () => (nested.current += 1), leave: () => (nested.current -= 1) }), []);
  const closeDetail = useCallback(() => {
    if (nested.current === 0) setShowDetail(false);
  }, []);

  return (
    <ModalGuardContext.Provider value={guard}>
      <div className="flex h-[calc(100dvh-120px)] -m-4 sm:-m-6 md:-m-8 bg-canvas rounded-2xl overflow-hidden border border-line shadow-md">
        {/* Contact list */}
        <div className={`w-full lg:w-[280px] min-[1360px]:w-[320px] bg-white border-r border-line flex-col flex-shrink-0 ${!showContactList ? "hidden lg:flex" : "flex"}`}>
          <ConversationList leads={leads} visible={visible} search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} selectedId={selectedId} onSelect={selectConversation} />
        </div>

        {/* Conversation */}
        {!selected ? (
          <div className={`flex-1 flex flex-col items-center justify-center bg-soft p-8 text-center ${showContactList ? "hidden lg:flex" : "flex"}`}>
            <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
              <MessageSquareIcon className="w-8 h-8" />
            </div>
            <h3 className="card-title">{t("Pilih percakapan")}</h3>
            <p className="text-body-sm text-fg-muted mt-1.5 max-w-[400px] leading-relaxed">{t("Pesan dari pelanggan yang menghubungi nomor WhatsApp bisnis Anda muncul di sini secara real-time.")}</p>
          </div>
        ) : (
          <>
            <div className={`flex-1 flex flex-col bg-canvas min-w-0 ${showContactList ? "hidden lg:flex" : "flex"}`}>
              <ConversationHeader
                lead={selected}
                onBack={() => {
                  setShowContactList(true);
                  setShowDetail(false);
                }}
                onShowDetail={() => setShowDetail(true)}
                onQris={() => setShowQris(true)}
                onChanged={() => loadMessages(selectedId, { quiet: true })}
              />

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5">
                {loadingMessages && <div className="text-center text-fg-muted text-label">{t("Memuat pesan...")}</div>}
                {!loadingMessages && messages.length === 0 && <div className="text-center text-fg-muted text-label">{t("Belum ada pesan dalam percakapan ini.")}</div>}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onEdit={startEdit} />
                ))}
                <div ref={bottomRef} />
              </div>

              <Composer
                channelType={selected.channelType}
                value={inputText}
                onChange={setInputText}
                onSubmit={handleSendMessage}
                sending={sending}
                editing={editing}
                onCancelEdit={cancelEdit}
                learn={learn}
                onLearn={setLearn}
                suggesting={suggesting}
                onSuggest={suggest}
              />
            </div>

            {/* Wide screens: fixed third pane */}
            <div className="hidden min-[1360px]:flex w-[300px] bg-white border-l border-line flex-col flex-shrink-0 p-5 overflow-y-auto">
              <CustomerDetail lead={selected} />
            </div>

            {/* Narrower screens: the same detail slides in from the right on demand */}
            <div className="min-[1360px]:hidden">
              <Modal open={showDetail} onClose={closeDetail} variant="drawer" title={t("Detail pelanggan")}>
                <CustomerDetail lead={selected} />
              </Modal>
            </div>
          </>
        )}

        {showQris && selected ? <QrisModal lead={selected} send={send} onClose={closeQris} /> : null}
      </div>
    </ModalGuardContext.Provider>
  );
}
