# T-089r-meta – Recherche: Instagram-Export und Insights-Metriken (Stand 2026)

**Zaun:** Reine Recherche, kein Code. Schreibe nur die Datei `REPORT-T-089r-meta.md` im aktuellen Verzeichnis.
Keine anderen Dateien anlegen oder ändern, keine Git-Befehle, keine Downloads ins Arbeitsverzeichnis.
Do not use spawn_subagent; work sequentially. Write the report file after every answered question and continue
from it, so nothing is lost if the run stops.

## Kontext

Global Audience Pulse (Web-App, zeigt einen 0–100-Aktivitäts-Score der Zielgruppe je Uhrzeit) soll prüfen, ob ein
höherer Score zur Veröffentlichungszeit eines Instagram-Beitrags mehr Reichweite bringt. Erste Datenquelle: der
Export, den ein Creator selbst aus der **Meta Business Suite** (Insights → Inhalte → Exportieren) bzw. aus
**Instagram Professional Dashboard** zieht. Später optional: **Instagram API with Instagram Login** (Insights per
API für das eigene Konto). Wir brauchen belastbare Fakten, bevor wir einen Parser und eine Statistik bauen.

## Fragen (jede Antwort mit Quelle)

1. **Exportspalten:** Welche Spalten enthält der Beitrags-Export der Meta Business Suite für Instagram (englische
   und deutsche Spaltennamen, wenn die Oberfläche auf Deutsch steht)? Insbesondere: Beitrags-ID, Permalink,
   Beitragstyp, Veröffentlichungszeit, Reichweite, Aufrufe/Views, Impressionen, Likes, Kommentare, Shares,
   Speicherungen, Follows, Profilbesuche, Dauer.
2. **Zeitzone und Format** der Veröffentlichungszeit im Export (Konto-Zeitzone, UTC, Pacific Time? Datumsformat?).
3. **Zeitraumgrenze:** Wie weit zurück reicht ein Export, wie viele Beiträge maximal, gibt es Limits pro Export?
4. **Metrik-Änderungen 2024–2026:** Wurde „Impressions“ durch „Views“ ersetzt (wann, für welche Beitragstypen)?
   Welche Insights-Metriken der Instagram-API sind veraltet oder entfernt (z. B. `impressions`, `plays`,
   `video_views`), welche sind aktuell (`reach`, `views`, `saved`, `shares`, `total_interactions`, …)?
5. **Stories und beworbene Beiträge:** Sind Stories im Beitrags-Export enthalten? Werden beworbene (bezahlte)
   Beiträge gekennzeichnet, und enthält die Reichweite dann bezahlte Reichweite?
6. **Zielgruppen-Länder:** Lassen sich die Länder (oder Städte) der Follower/erreichten Konten exportieren oder per
   API abrufen (Metrik, Mindestanzahl Follower, Zeitraum)?
7. **Wann ist Reichweite „fertig“?** Gibt es offizielle Angaben, wie lange Insights eines Beitrags noch wachsen bzw.
   wie lange sie verfügbar sind (z. B. Stories nur 24 h / 2 Jahre)?
8. **API für das eigene Konto:** Braucht die Instagram API with Instagram Login für das eigene Konto (Entwickler =
   Kontoinhaber, Entwicklungsmodus) ein App-Review? Welche Berechtigungen (`instagram_business_basic`,
   `instagram_business_manage_insights`)? Kosten? Token-Laufzeit?

## Quellenregeln

- Nur offizielle Quellen von Meta: developers.facebook.com, facebook.com/business/help, help.instagram.com,
  about.instagram.com, transparency.meta.com. Blogs/Agenturseiten höchstens als Hinweis, klar markiert, nie als Beleg.
- Jede Aussage mit URL und dem Datum, das auf der Seite steht (oder „ohne Datum“).
- Wenn etwas nicht offiziell belegt ist: „nicht belegt“ schreiben, nicht raten.

## Ausgabe `REPORT-T-089r-meta.md`

Pro Frage eine Tabelle: `Aussage | Quelle (URL) | Datum auf der Seite | sicher/unsicher`. Am Ende ein Abschnitt
„Folgen für den Parser“ mit einer Liste der erwarteten Spaltennamen (EN/DE) und der Zeitzone.

## Abnahme (Claude)

Claude prüft mindestens drei Aussagen direkt an der Quelle. Erfundene oder nicht passende URLs = Auftrag
gescheitert.

## Verlauf

- 2026-10-13 Claude: Auftrag angelegt (Grok 4.7).
- 2026-10-13 Claude: Grok-Start mit vollen Rechten vom Sicherheitsfilter der Session blockiert. Fragen 4, 5 (Teil
  bezahlte Reichweite) und 7 selbst an der Meta-Doku beantwortet (in T-089 übernommen). Fragen 1–3 und 6 klärt
  Belkis' erster Export; Frage 8 erst bei P4.
