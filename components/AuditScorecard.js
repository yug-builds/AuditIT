// Component: Audit Scorecard & Interactive Line-Item Verification Panel
import { formatRupees, round2 } from "../utils/auditEngine.js";

export function renderAuditScorecard(container, invoice, audit, options = {}) {
  const { 
    onUpdateItem, 
    onAddItem, 
    onDeleteItem,
    onUpdateHeader,
    onAutoFixMath,
    onUpdateTaxSettings,
    onSubmitValidInputs,
    onCopyNote, 
    onOpenCaSlip, 
    onBack, 
    selectedItemId, 
    taxData, 
    onRefreshTaxAi,
    onSaveToLedger
  } = options;



  // Calculations gatekeeper disabled
  if (false && audit.isHalted) {
    const missingList = audit.missingOrUnclearInputs || [];
    container.innerHTML = `
      <div class="space-y-4">
        
        <!-- HALT BANNER -->
        <div class="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 text-amber-950 shadow-sm space-y-4">
          <div class="flex items-start space-x-3.5">
            <div class="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm">
              ⚠️
            </div>
            <div>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 mb-1">
                Calculations Paused
              </span>
              <h3 class="text-base sm:text-lg font-black text-amber-950 tracking-tight">
                Valid Input Required Before Calculating
              </h3>
              <p class="text-xs text-amber-900 mt-1 leading-relaxed">
                Some details on this document are missing or illegible. To ensure 100% mathematical accuracy and avoid incorrect tax calculations, 
                please review your bill on the left and enter the valid numbers below:
              </p>
            </div>
          </div>

          <!-- MISSING / UNCLEAR FIELDS FORM -->
          <div class="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs space-y-3.5 text-xs text-slate-800">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <span class="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Please Provide or Confirm ${missingList.length} Missing Detail(s):
              </span>
              <span class="text-[10px] text-amber-700 font-semibold">Zero Guesswork</span>
            </div>

            <div class="space-y-3" id="missing-inputs-form">
              ${missingList.map((m, idx) => `
                <div class="p-3 rounded-lg bg-amber-50/40 border border-amber-200 space-y-1.5" data-field-row="${m.field}">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <span class="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-mono">${idx + 1}</span>
                      <span>${m.label}</span>
                    </label>
                    ${m.isGstin ? `
                      <button type="button" class="btn-mark-unregistered text-[10px] font-bold text-emerald-700 hover:underline">
                        ✓ Mark as Unregistered (No GSTIN)
                      </button>
                    ` : ''}
                  </div>
                  
                  <p class="text-[11px] text-slate-500">${m.description}</p>

                  <div class="mt-1">
                    <input 
                      type="${m.isNumber || m.isItemRate || m.isItemQty ? 'number' : 'text'}" 
                      ${m.isNumber || m.isItemRate ? 'step="0.01"' : ''}
                      class="missing-input-field w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-slate-900 bg-white"
                      data-field="${m.field}"
                      data-item-index="${m.itemIndex !== undefined ? m.itemIndex : ''}"
                      value="${m.currentValue || ''}"
                      placeholder="${m.placeholder || 'Enter value...'}"
                    />
                  </div>
                </div>
              `).join("")}
            </div>

            <!-- Lock Explanation Notice -->
            <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-2 text-[11px] text-slate-600">
              <span class="text-sm">🔒</span>
              <span>Calculations, discrepancies, and tax recommendations will calculate immediately after you submit valid inputs.</span>
            </div>

            <!-- Submit Button -->
            <div class="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button 
                id="btn-submit-valid-inputs" 
                class="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>🚀 Confirm Inputs & Calculate Audit</span>
              </button>

              <button 
                id="btn-back-dashboard-halt" 
                class="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
              >
                ← Back
              </button>
            </div>

          </div>

        </div>

      </div>
    `;

    // Handle Mark as Unregistered
    container.querySelectorAll(".btn-mark-unregistered").forEach(btn => {
      btn.addEventListener("click", () => {
        const gstinInput = container.querySelector(`input[data-field="gstin"]`);
        if (gstinInput) {
          gstinInput.value = "UNREGISTERED";
          gstinInput.classList.add("bg-emerald-50", "text-emerald-800", "font-bold");
        }
      });
    });

    // Handle Submit
    const btnSubmit = container.querySelector("#btn-submit-valid-inputs");
    if (btnSubmit && onSubmitValidInputs) {
      btnSubmit.addEventListener("click", () => {
        const fields = {};
        container.querySelectorAll(".missing-input-field").forEach(inp => {
          const field = inp.getAttribute("data-field");
          const itemIdx = inp.getAttribute("data-item-index");
          const val = inp.value.trim();
          fields[field] = { value: val, itemIndex: itemIdx !== '' ? parseInt(itemIdx, 10) : null };
        });
        onSubmitValidInputs(fields);
      });
    }

    const btnBackHalt = container.querySelector("#btn-back-dashboard-halt");
    if (btnBackHalt && onBack) {
      btnBackHalt.addEventListener("click", onBack);
    }
    return;
  }

  const isOvercharge = audit.hasTotalDiscrepancy;
  const isClean = audit.status === "VERIFIED";
  const isWarning = audit.status === "REVIEW_NEEDED";

  // --- TRAFFIC-LIGHT UI SYSTEM ---
  const SVG_WARNING = `<svg class="w-3.5 h-3.5 inline-block text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  const SVG_CHECK = `<svg class="w-3.5 h-3.5 inline-block text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

  // Validation states for Summary Totals (Subtotal, Tax, Grand Total)
  const isSubtotalErr = invoice.subtotal === "UNREADABLE" || audit.hasLineItemMathError || audit.issues.some(i => i.field === "items" && i.type === "ERROR");
  const isTaxErr = invoice.cgst === "UNREADABLE" || invoice.sgst === "UNREADABLE" || invoice.igst === "UNREADABLE" || audit.issues.some(i => (i.field === "igst" || i.field === "gst_split") && (i.type === "ERROR" || i.type === "COMPLIANCE_ERROR"));
  const isTotalErr = invoice.total_declared === "UNREADABLE" || invoice.declared_total === "UNREADABLE" || audit.hasTotalDiscrepancy;

  // Validation states for Header Inputs
  const isVendorErr = invoice.vendor_name === "UNREADABLE" || !invoice.vendor_name || invoice.vendor_name.trim().length === 0;
  const isGstinErr = invoice.gstin === "UNREADABLE" || !audit.gstinValid;

  // Validation states for Tax Inputs
  const isCgstErr = invoice.cgst === "UNREADABLE" || audit.issues.some(i => i.field === "gst_split" && (i.type === "COMPLIANCE_ERROR" || i.type === "WARNING"));
  const isSgstErr = invoice.sgst === "UNREADABLE" || audit.issues.some(i => i.field === "gst_split" && (i.type === "COMPLIANCE_ERROR" || i.type === "WARNING"));
  const isIgstErr = invoice.igst === "UNREADABLE" || audit.issues.some(i => i.field === "igst" && (i.type === "COMPLIANCE_ERROR" || i.type === "WARNING"));

  const { audit_summary, calculated_tax, ai_suggestions } = taxData || {
    audit_summary: {
      total_turnover: 3600000,
      deemed_profit: 244800,
      eligible_itc: audit.gstinValid ? audit.totalTax : 0,
      disallowed_itc: !audit.gstinValid ? audit.totalTax : 0,
      invoices_missing_gstin: audit.gstinValid ? 0 : 1,
      digital_ratio: 0.60
    },
    calculated_tax: {
      recommended_form: "ITR-4 (Presumptive Scheme - Sec 44AD)",
      annual_turnover: 3600000,
      digital_percent: 60,
      cash_percent: 40,
      deemed_net_profit: 244800,
      estimated_tax_liability: 0,
      tax_regime: "New Regime (Section 115BAC)"
    },
    ai_suggestions: {
      suggestions: [
        "Recommended ITR Form: File ITR-4 Sugam under Section 44AD presumptive scheme because your retail turnover is within ₹2-3 Crores, allowing you to declare deemed profit without maintaining formal books.",
        audit.gstinValid 
          ? `GST ITC Opportunity / Risk: You have ${formatRupees(audit.totalTax)} in eligible Input Tax Credit from this bill to directly offset your GST liability.`
          : `GST ITC Opportunity / Risk: Missing supplier GSTIN blocks ${formatRupees(audit.totalTax)} in Input Tax Credit. Request a valid GSTIN bill to avoid higher tax outgo.`,
        "Advance Tax & Action Item: Remind yourself to pay 100% of your advance tax by March 15 to avoid penal interest under Section 234B/234C."
      ],
      disclaimer: "Not tax advice; verify with your CA.",
      isAiGenerated: false
    }
  };

  container.innerHTML = `
    <div class="space-y-4">

      <!-- VERDICT HEADER BANNER -->
      <div class="rounded-xl p-4 sm:p-5 border transition-all ${
        isOvercharge 
          ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-sm'
          : isWarning
          ? 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-sm'
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-sm'
      }">
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              isOvercharge ? 'bg-rose-600 text-white shadow-rose-200 shadow' : isWarning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white shadow-emerald-200 shadow'
            }">
              ${isOvercharge ? '!' : isWarning ? '?' : '✓'}
            </div>
            <div>
              <div class="text-xs uppercase tracking-wider font-bold ${
                isOvercharge ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
              }">Audit Verdict / अंतिम परिणाम</div>
              <h3 class="text-lg sm:text-xl font-extrabold tracking-tight">
                ${audit.statusText}
              </h3>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            ${isOvercharge ? `
              <button id="btn-autofix-math" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-rose-700 border border-rose-300 shadow-xs hover:bg-rose-100 transition-all flex items-center space-x-1" title="Automatically correct declared total to match verified sum">
                <span>🪄 Auto-Fix Bill Math</span>
              </button>
            ` : ''}

            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOvercharge ? 'bg-rose-100 text-rose-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }">
              ${audit.status}
            </span>
          </div>
        </div>

        <!-- Discrepancy Difference Callout -->
        ${isOvercharge ? `
          <div class="mt-3.5 pt-3 border-t border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p class="text-xs text-rose-800 font-medium leading-relaxed">
              <strong>Calculated vs Declared Difference:</strong> You are being billed <span class="underline decoration-rose-500 font-bold">${formatRupees(Math.abs(audit.totalDiff))}</span> more than the verified sum of goods and taxes.
            </p>
            <div class="flex items-center space-x-2 shrink-0">
              <button id="btn-quick-copy" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow transition-all active:scale-95">
                <span>📋 Copy Note</span>
              </button>
              <button id="btn-quick-wa" class="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all active:scale-95">
                <span>📲 WhatsApp</span>
              </button>
            </div>
          </div>
        ` : ''}

        ${isClean ? `
          <div class="mt-2.5 pt-2 border-t border-emerald-200/80 text-xs text-emerald-800 font-medium">
            ✅ Every line item (Qty × Rate) and GST amount matches the declared grand total perfectly. Safe to clear payment.
          </div>
        ` : ''}

        ${isWarning ? `
          <div class="mt-2.5 pt-2 border-t border-amber-200/80 text-xs text-amber-800 font-medium">
            ⚠️ Review needed: Missing supplier GSTIN blocks Input Tax Credit (ITC), or blurry rate fields require your manual check.
          </div>
        ` : ''}
      </div>

      <!-- THREE-METRIC SUMMARY TOTALS (Subtotal, Tax, Grand Total) - TRAFFIC-LIGHT UI SYSTEM -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <!-- Subtotal -->
        <div class="p-3 sm:p-3.5 rounded-xl border shadow-sm text-center transition-all ${
          isSubtotalErr 
            ? 'bg-red-100 text-red-800 border-red-300' 
            : 'bg-green-50 text-green-800 border-green-200'
        }">
          <span class="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
            ${isSubtotalErr ? SVG_WARNING : SVG_CHECK}
            <span>Subtotal</span>
          </span>
          <span class="text-sm sm:text-base font-extrabold font-mono block mt-0.5">
            ${formatRupees(audit.sum_items)}
          </span>
          <span class="text-[9px] opacity-75">सकल योग</span>
        </div>

        <!-- Total Tax -->
        <div class="p-3 sm:p-3.5 rounded-xl border shadow-sm text-center transition-all ${
          isTaxErr 
            ? 'bg-red-100 text-red-800 border-red-300' 
            : 'bg-green-50 text-green-800 border-green-200'
        }">
          <span class="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
            ${isTaxErr ? SVG_WARNING : SVG_CHECK}
            <span>Total Tax</span>
          </span>
          <span class="text-sm sm:text-base font-extrabold font-mono block mt-0.5">
            ${formatRupees(audit.totalTax)}
          </span>
          <span class="text-[9px] opacity-75">कुल जीएसटी</span>
        </div>

        <!-- Grand Total -->
        <div class="p-3 sm:p-3.5 rounded-xl border shadow-sm text-center transition-all ${
          isTotalErr 
            ? 'bg-red-100 text-red-800 border-red-300' 
            : 'bg-green-50 text-green-800 border-green-200'
        }">
          <span class="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
            ${isTotalErr ? SVG_WARNING : SVG_CHECK}
            <span>Grand Total</span>
          </span>
          <span class="text-sm sm:text-base font-extrabold font-mono block mt-0.5">
            ${formatRupees(audit.total_declared)}
          </span>
          <span class="text-[9px] opacity-75">${audit.hasTotalDiscrepancy ? `Diff: ${formatRupees(audit.totalDiff)}` : 'Verified Match'}</span>
        </div>
      </div>

      <!-- REAL-TIME EDITABLE BILL HEADERS (Vendor, GSTIN, Billed Total) -->
      <div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Bill Header Inputs (Real-Time Edit)</span>
          <span class="text-[10px] text-slate-400">Updates bill & audit instantly</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <!-- Supplier Name -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Supplier Name</span>
              <span class="flex items-center space-x-1 text-[9px] font-bold">
                ${isVendorErr ? `${SVG_WARNING} <span class="text-red-700">Required / Unclear</span>` : `${SVG_CHECK} <span class="text-green-700">Verified</span>`}
              </span>
            </label>
            <input 
              type="text" 
              id="input-vendor-name"
              value="${invoice.vendor_name || ''}"
              placeholder="e.g. Sharma Wholesale"
              class="w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium focus:ring-1 transition-all ${
                isVendorErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 placeholder-red-400' 
                  : 'bg-green-50 text-green-800 border-green-300 focus:border-green-500 focus:ring-green-500'
              }"
            />
          </div>

          <!-- Supplier GSTIN -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Supplier GSTIN (15-Char)</span>
              <span class="flex items-center space-x-1 text-[9px] font-bold">
                ${isGstinErr ? `${SVG_WARNING} <span class="text-red-700">Invalid / Missing</span>` : `${SVG_CHECK} <span class="text-green-700">Valid</span>`}
              </span>
            </label>
            <input 
              type="text" 
              id="input-gstin"
              value="${invoice.gstin || ''}"
              maxlength="15"
              placeholder="e.g. 07AAAAA0000A1Z5"
              class="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono uppercase focus:ring-1 transition-all ${
                isGstinErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 placeholder-red-400' 
                  : 'bg-green-50 text-green-800 border-green-300 focus:border-green-500 focus:ring-green-500'
              }"
            />
          </div>

          <!-- Declared Grand Total -->
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Billed Grand Total (₹)</span>
              <span class="flex items-center space-x-1 text-[9px] font-bold">
                ${isTotalErr ? `${SVG_WARNING} <span class="text-red-700">Diff: ${formatRupees(audit.totalDiff)}</span>` : `${SVG_CHECK} <span class="text-green-700">Verified</span>`}
              </span>
            </label>
            <input 
              type="number" 
              step="0.01"
              id="input-total-declared"
              value="${invoice.total_declared || 0}"
              class="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono text-right focus:ring-1 transition-all ${
                isTotalErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                  : 'bg-green-50 text-green-800 border-green-300 focus:border-green-500 focus:ring-green-500 font-bold'
              }"
            />
          </div>
        </div>
      </div>

      <!-- EDITABLE LINE-ITEMS AUDIT TABLE -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Item Breakdown & Math Check</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-mono font-semibold">${invoice.items.length} items</span>
          </div>

          <div class="flex items-center space-x-2">
            <button 
              id="btn-add-item" 
              class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1 transition-all"
            >
              <span>➕ Add Line Item</span>
            </button>
          </div>
        </div>

        <!-- ===================== DESKTOP TABLE (md: and above) ===================== -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-100/60 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <th class="py-2 pl-3">Item Description</th>
                <th class="py-2 text-right w-16">Qty</th>
                <th class="py-2 text-right w-20">Rate (₹)</th>
                <th class="py-2 text-right w-20">Disc (₹)</th>
                <th class="py-2 text-right w-16">Tax %</th>
                <th class="py-2 text-right w-24">Billed (₹)</th>
                <th class="py-2 text-right w-24">Verified (₹)</th>
                <th class="py-2 text-center w-16">Status</th>
                <th class="py-2 pr-2 text-center w-10">Del</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${audit.lineItemAudit.map((item, idx) => {
                const isSelected = selectedItemId === (item.id || idx.toString());
                const isErr = item.isMathError;
                const isBlurry = item.is_blurry;
                const withinTol = item.isWithinTolerance;
                const discount = Number(item.discount) || 0;
                const taxRate = item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== "UNREADABLE" ? item.tax_rate : "";

                const isDescErr = item.description === "UNREADABLE" || !item.description || item.description.trim().length === 0;
                const isQtyErr = item.qty === "UNREADABLE" || Number(item.qty) <= 0;
                const isRateErr = item.rate === "UNREADABLE" || isBlurry || Number(item.rate) <= 0;
                const isDiscErr = item.discount === "UNREADABLE";
                const isAmtErr = item.declaredAmount === "UNREADABLE" || isErr;

                return `
                  <tr class="transition-colors ${
                    isErr 
                      ? 'bg-red-100/70 hover:bg-red-100' 
                      : isBlurry 
                      ? 'bg-amber-50/60 hover:bg-amber-100/50' 
                      : isSelected 
                      ? 'bg-indigo-50/60 hover:bg-indigo-100/50' 
                      : 'hover:bg-slate-50'
                  }" id="scorecard-row-${item.id || idx}">
                    
                    <td class="py-2 pl-3">
                      <div class="flex items-center space-x-1">
                        ${isDescErr ? SVG_WARNING : SVG_CHECK}
                        <input 
                          type="text" 
                          value="${item.description || ''}"
                          placeholder="Item name"
                          class="w-full px-1.5 py-0.5 rounded border text-xs font-semibold focus:ring-1 transition-all ${
                            isDescErr 
                              ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                          }"
                          data-action="edit-desc"
                          data-index="${idx}"
                        />
                      </div>
                      ${item.hsn ? `<span class="text-[10px] font-mono text-slate-400 block px-1.5">HSN: ${item.hsn}</span>` : ''}
                      ${isErr ? `<div class="text-[10px] text-red-700 font-medium px-1.5 mt-0.5 flex items-center gap-1">${SVG_WARNING} Expected: ${item.qty} × ${formatRupees(item.rate)}${discount > 0 ? ` - ${formatRupees(discount)}` : ''} = ${formatRupees(item.calculatedAmount)}</div>` : ''}
                    </td>

                    <!-- Editable Qty -->
                    <td class="py-2 text-right font-mono">
                      <input 
                        type="number" 
                        step="1"
                        min="0"
                        value="${item.qty}"
                        class="w-14 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                          isQtyErr 
                            ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                            : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                        }"
                        data-action="edit-qty"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Editable Rate -->
                    <td class="py-2 text-right font-mono">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value="${item.rate}"
                        class="w-20 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                          isRateErr 
                            ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                            : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                        }"
                        data-action="edit-rate"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Discount -->
                    <td class="py-2 text-right font-mono">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value="${discount}"
                        class="w-20 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                          isDiscErr 
                            ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                            : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                        }"
                        data-action="edit-discount"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Tax Rate -->
                    <td class="py-2 text-right font-mono text-[11px] text-slate-600">
                      ${taxRate !== "" ? taxRate + "%" : '<span class="text-slate-300">—</span>'}
                    </td>

                    <!-- Billed Amount -->
                    <td class="py-2 text-right font-mono font-medium">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value="${item.declaredAmount}"
                        class="w-20 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                          isAmtErr 
                            ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                            : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500 font-bold'
                        }"
                        data-action="edit-amount"
                        data-index="${idx}"
                      />
                    </td>

                    <!-- Verified Calculated Amount -->
                    <td class="py-2 text-right font-mono font-bold ${isAmtErr ? 'text-red-700' : 'text-green-800'}">
                      <span class="inline-flex items-center justify-end gap-1">
                        ${isAmtErr ? SVG_WARNING : SVG_CHECK}
                        <span>${formatRupees(item.calculatedAmount)}</span>
                      </span>
                    </td>

                    <!-- Status Pill -->
                    <td class="py-2 text-center">
                      ${isErr ? `
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-300">
                          ${SVG_WARNING} -₹${Math.abs(item.diff).toFixed(0)}
                        </span>
                      ` : isBlurry ? `
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Unclear
                        </span>
                      ` : withinTol ? `
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                          ≈ Match
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-800 border border-green-200">
                          ${SVG_CHECK} Match
                        </span>
                      `}
                    </td>

                    <!-- Delete Row Button -->
                    <td class="py-2 pr-2 text-center">
                      <button 
                        data-action="delete-item" 
                        data-index="${idx}"
                        class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                        title="Delete this line item"
                      >
                        ✕
                      </button>
                    </td>

                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        <!-- ===================== MOBILE CARD LAYOUT (below md:) ===================== -->
        <div class="md:hidden divide-y divide-slate-100">
          ${audit.lineItemAudit.map((item, idx) => {
            const isErr = item.isMathError;
            const isBlurry = item.is_blurry;
            const withinTol = item.isWithinTolerance;
            const discount = Number(item.discount) || 0;
            const taxRate = item.tax_rate !== undefined && item.tax_rate !== null && item.tax_rate !== "UNREADABLE" ? item.tax_rate : "";

            const isDescErr = item.description === "UNREADABLE" || !item.description || item.description.trim().length === 0;
            const isQtyErr = item.qty === "UNREADABLE" || Number(item.qty) <= 0;
            const isRateErr = item.rate === "UNREADABLE" || isBlurry || Number(item.rate) <= 0;
            const isDiscErr = item.discount === "UNREADABLE";
            const isAmtErr = item.declaredAmount === "UNREADABLE" || isErr;

            return `
              <div class="p-3 space-y-2 ${
                isErr 
                  ? 'bg-red-50/70' 
                  : isBlurry 
                  ? 'bg-amber-50/60' 
                  : ''
              }" id="scorecard-card-${item.id || idx}">

                <!-- Card Header: Item Name + Status -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-1">
                      ${isDescErr ? SVG_WARNING : SVG_CHECK}
                      <input 
                        type="text" 
                        value="${item.description || ''}"
                        placeholder="Item name"
                        class="w-full px-1.5 py-1 rounded border text-sm font-bold focus:ring-1 transition-all truncate ${
                          isDescErr 
                            ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                        }"
                        data-action="edit-desc"
                        data-index="${idx}"
                      />
                    </div>
                    ${item.hsn ? `<span class="text-[10px] font-mono text-slate-400 block px-1.5">HSN: ${item.hsn}</span>` : ''}
                  </div>
                  <div class="flex items-center space-x-1.5 shrink-0">
                    ${isErr ? `
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-300">
                        ${SVG_WARNING} -₹${Math.abs(item.diff).toFixed(0)}
                      </span>
                    ` : isBlurry ? `
                      <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        Unclear
                      </span>
                    ` : withinTol ? `
                      <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        ≈ Match
                      </span>
                    ` : `
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-800 border border-green-200">
                        ${SVG_CHECK} Match
                      </span>
                    `}
                    <button 
                      data-action="delete-item" 
                      data-index="${idx}"
                      class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors text-xs"
                      title="Delete this line item"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                ${isErr ? `<div class="text-[10px] text-red-700 font-medium px-1.5 flex items-center gap-1">${SVG_WARNING} Expected: ${item.qty} × ${formatRupees(item.rate)}${discount > 0 ? ` - ${formatRupees(discount)}` : ''} = ${formatRupees(item.calculatedAmount)}</div>` : ''}

                <!-- 2-Column Compact Grid for Qty, Rate, Discount, Tax, Billed, Verified -->
                <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <!-- Qty -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-0.5">
                      <span>Qty</span>
                    </span>
                    <input 
                      type="number" step="1" min="0"
                      value="${item.qty}"
                      class="w-16 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                        isQtyErr 
                          ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                          : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                      }"
                      data-action="edit-qty"
                      data-index="${idx}"
                    />
                  </div>

                  <!-- Rate -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-0.5">
                      <span>Rate</span>
                    </span>
                    <input 
                      type="number" step="0.01" min="0"
                      value="${item.rate}"
                      class="w-20 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                        isRateErr 
                          ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                          : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                      }"
                      data-action="edit-rate"
                      data-index="${idx}"
                    />
                  </div>

                  <!-- Discount -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-0.5">
                      <span>Disc</span>
                    </span>
                    <input 
                      type="number" step="0.01" min="0"
                      value="${discount}"
                      class="w-16 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                        isDiscErr 
                          ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                          : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
                      }"
                      data-action="edit-discount"
                      data-index="${idx}"
                    />
                  </div>

                  <!-- Tax Rate -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-slate-500 uppercase">Tax</span>
                    <span class="font-mono text-xs text-slate-600 pr-1">${taxRate !== "" ? taxRate + "%" : '—'}</span>
                  </div>

                  <!-- Billed -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold ${isAmtErr ? 'text-red-700' : 'text-slate-500'} uppercase">Billed</span>
                    <input 
                      type="number" step="0.01" min="0"
                      value="${item.declaredAmount}"
                      class="w-20 text-right px-1.5 py-1 rounded border font-mono text-xs focus:ring-1 transition-all ${
                        isAmtErr 
                          ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                          : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500 font-bold'
                      }"
                      data-action="edit-amount"
                      data-index="${idx}"
                    />
                  </div>

                  <!-- Verified -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-emerald-600 uppercase">Verified</span>
                    <span class="font-mono text-xs font-bold ${isAmtErr ? 'text-red-700' : 'text-green-800'} pr-1 flex items-center gap-1">
                      ${isAmtErr ? SVG_WARNING : SVG_CHECK}
                      <span>${formatRupees(item.calculatedAmount)}</span>
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

      </div>

      <!-- TAX BREAKDOWN & GST PRESETS -->
      <div class="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">GST Tax Rate & Split</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${((invoice.gstin || '06').slice(0, 2) === (invoice.buyer_gstin || '06').slice(0, 2)) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
              ${((invoice.gstin || '06').slice(0, 2) === (invoice.buyer_gstin || '06').slice(0, 2)) ? `Intra-State (${(invoice.gstin || '06').slice(0, 2)}=${(invoice.buyer_gstin || '06').slice(0, 2)})` : `Inter-State (${(invoice.gstin || '06').slice(0, 2)}≠${(invoice.buyer_gstin || '06').slice(0, 2)})`}
            </span>
          </div>
          <span class="text-xs font-mono font-bold flex items-center gap-1 ${isTaxErr ? 'text-red-700' : 'text-green-700'}">
            ${isTaxErr ? SVG_WARNING : SVG_CHECK}
            <span>Total Tax: ${formatRupees(audit.totalTax)}</span>
          </span>
        </div>

        <!-- Quick GST Rate Presets -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="text-[10px] text-slate-500 font-medium">Quick GST Rates:</span>
          <button data-gst-preset="0" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">0% (Exempt)</button>
          <button data-gst-preset="5" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">5% (Grocery/Atta)</button>
          <button data-gst-preset="12" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">12% (Standard)</button>
          <button data-gst-preset="18" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">18% (Electrical)</button>
          <button data-gst-preset="28" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">28% (Luxury)</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>CGST (Intra-State) ₹</span>
              ${isCgstErr ? SVG_WARNING : SVG_CHECK}
            </label>
            <input 
              type="number" 
              step="0.01" 
              id="input-cgst" 
              value="${invoice.cgst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border font-mono text-xs text-right focus:ring-1 transition-all ${
                isCgstErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                  : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
              }"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>SGST (Intra-State) ₹</span>
              ${isSgstErr ? SVG_WARNING : SVG_CHECK}
            </label>
            <input 
              type="number" 
              step="0.01" 
              id="input-sgst" 
              value="${invoice.sgst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border font-mono text-xs text-right focus:ring-1 transition-all ${
                isSgstErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                  : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
              }"
            />
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>IGST (Inter-State) ₹</span>
              ${isIgstErr ? SVG_WARNING : SVG_CHECK}
            </label>
            <input 
              type="number" 
              step="0.01" 
              id="input-igst" 
              value="${invoice.igst || 0}"
              class="w-full px-2 py-1.5 rounded-lg border font-mono text-xs text-right focus:ring-1 transition-all ${
                isIgstErr 
                  ? 'bg-red-100 text-red-800 border-red-300 focus:border-red-500 focus:ring-red-500 font-bold' 
                  : 'bg-green-50 text-green-800 border-green-200 focus:border-green-500 focus:ring-green-500'
              }"
            />
          </div>
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="flex flex-col sm:flex-row items-center gap-2 pt-2">
        <button id="btn-save-to-ledger" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>💾 Save Bill to Tax Ledger</span>
        </button>

        <button id="btn-copy-discrepancy" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📋 Copy Note</span>
        </button>

        <button id="btn-share-whatsapp" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📲 WhatsApp</span>
        </button>

        <button id="btn-open-ca-slip" class="w-full sm:flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow transition-all active:scale-95">
          <span>📑 CA Slip</span>
        </button>

        <button id="btn-back-dashboard" class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all">
          <span>← Back</span>
        </button>
      </div>

    </div>
  `;

  // Attach event handlers
  const btnQuickCopy = container.querySelector("#btn-quick-copy");
  if (btnQuickCopy && onCopyNote) {
    btnQuickCopy.addEventListener("click", onCopyNote);
  }

  const btnCopy = container.querySelector("#btn-copy-discrepancy");
  if (btnCopy && onCopyNote) {
    btnCopy.addEventListener("click", onCopyNote);
  }

  const btnShareWa = container.querySelector("#btn-share-whatsapp");
  const btnQuickWa = container.querySelector("#btn-quick-wa");
  const handleWa = () => {
    const text = container.querySelector("#btn-copy-discrepancy") ? onCopyNote(true) : "";
  };
  if (btnShareWa && onCopyNote) {
    btnShareWa.addEventListener("click", () => onCopyNote(true));
  }
  if (btnQuickWa && onCopyNote) {
    btnQuickWa.addEventListener("click", () => onCopyNote(true));
  }

  const btnCaSlip = container.querySelector("#btn-open-ca-slip");
  if (btnCaSlip && onOpenCaSlip) {
    btnCaSlip.addEventListener("click", onOpenCaSlip);
  }

  const btnSaveLedger = container.querySelector("#btn-save-to-ledger");
  if (btnSaveLedger && onSaveToLedger) {
    btnSaveLedger.addEventListener("click", () => onSaveToLedger(invoice, audit));
  }

  const btnBack = container.querySelector("#btn-back-dashboard");
  if (btnBack && onBack) {
    btnBack.addEventListener("click", onBack);
  }

  const btnAddItem = container.querySelector("#btn-add-item");
  if (btnAddItem && onAddItem) {
    btnAddItem.addEventListener("click", onAddItem);
  }

  const btnAutoFix = container.querySelector("#btn-autofix-math");
  if (btnAutoFix && onAutoFixMath) {
    btnAutoFix.addEventListener("click", onAutoFixMath);
  }

  // Header real-time updates
  const inputVendor = container.querySelector("#input-vendor-name");
  const inputGstin = container.querySelector("#input-gstin");
  const inputTotalDeclared = container.querySelector("#input-total-declared");

  if (inputVendor && onUpdateHeader) {
    inputVendor.addEventListener("input", (e) => onUpdateHeader("vendor_name", e.target.value));
  }
  if (inputGstin && onUpdateHeader) {
    inputGstin.addEventListener("input", (e) => onUpdateHeader("gstin", e.target.value.trim().toUpperCase()));
  }
  if (inputTotalDeclared && onUpdateHeader) {
    inputTotalDeclared.addEventListener("input", (e) => onUpdateHeader("total_declared", parseFloat(e.target.value) || 0));
  }

  // Tax inputs (CGST, SGST, IGST)
  const inputCgst = container.querySelector("#input-cgst");
  const inputSgst = container.querySelector("#input-sgst");
  const inputIgst = container.querySelector("#input-igst");

  if (inputCgst && onUpdateHeader) {
    inputCgst.addEventListener("input", (e) => onUpdateHeader("cgst", parseFloat(e.target.value) || 0));
  }
  if (inputSgst && onUpdateHeader) {
    inputSgst.addEventListener("input", (e) => onUpdateHeader("sgst", parseFloat(e.target.value) || 0));
  }
  if (inputIgst && onUpdateHeader) {
    inputIgst.addEventListener("input", (e) => onUpdateHeader("igst", parseFloat(e.target.value) || 0));
  }

  // GST Presets: Click Handler Sync with Intra-State vs Inter-State Auto-Determination
  container.querySelectorAll("[data-gst-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetAttr = btn.getAttribute("data-gst-preset");
      const ratePct = parseFloat(presetAttr) / 100;
      // Recalculate dynamically based on current Subtotal (e.g. 11,000)
      const subtotal = round2(Number(invoice.subtotal) || Number(invoice.calculated_subtotal) || audit.sum_items || 0);

      // Compare first 2 digits of Supplier GSTIN (06) and Buyer GSTIN (06)
      const supplierGstin = (invoice.gstin || "").trim().toUpperCase();
      const buyerGstin = (invoice.buyer_gstin || "06CORPP2712A1Z1").trim().toUpperCase();
      const supplierState = supplierGstin ? supplierGstin.slice(0, 2) : "06";
      const buyerState = buyerGstin ? buyerGstin.slice(0, 2) : "06";
      const isIntraState = supplierState === buyerState;

      let newCgst = 0;
      let newSgst = 0;
      let newIgst = 0;

      if (presetAttr === "18" || ratePct === 0.18) {
        if (isIntraState) {
          // Clicking '[18% (Electrical)]' should immediately set:
          // cgst = subtotal * 0.09;
          // sgst = subtotal * 0.09;
          // igst = 0;
          newCgst = round2(subtotal * 0.09);
          newSgst = round2(subtotal * 0.09);
          newIgst = 0;
        } else {
          newCgst = 0;
          newSgst = 0;
          newIgst = round2(subtotal * 0.18);
        }
      } else {
        const taxAmount = round2(subtotal * ratePct);
        if (isIntraState) {
          newIgst = 0;
          newCgst = round2(taxAmount / 2);
          newSgst = round2(taxAmount / 2);
        } else {
          newCgst = 0;
          newSgst = 0;
          newIgst = taxAmount;
        }
      }

      // Update inputs immediately for instant sync
      if (inputCgst) inputCgst.value = newCgst;
      if (inputSgst) inputSgst.value = newSgst;
      if (inputIgst) inputIgst.value = newIgst;

      // Trigger re-audit immediately so Verified Total becomes 12,980.00
      if (onUpdateHeader) {
        onUpdateHeader("gst_preset", { cgst: newCgst, sgst: newSgst, igst: newIgst });
      }
    });
  });

  // Handle line item edits & delete
  container.querySelectorAll("input[data-action]").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"), 10);
      const action = e.target.getAttribute("data-action");
      const val = action === "edit-desc" ? e.target.value : (parseFloat(e.target.value) || 0);

      if (onUpdateItem) {
        onUpdateItem(idx, action, val);
      }
    });
  });

  container.querySelectorAll("button[data-action='delete-item']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (onDeleteItem) {
        onDeleteItem(idx);
      }
    });
  });
}
