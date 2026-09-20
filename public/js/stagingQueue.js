/**
 * DevTools Inspect Staging Array Handler
 *
 * Implements client-side array formation strictly visible in the browser DevTools Inspect section.
 * Staged assets reside solely in browser memory (not written to database)
 * until the async promise is achieved or cancelled.
 */

window.__laboTrackInspectQueue = [];

// Helper accessible directly in DevTools Console:
window.getInspectQueue = function () {
  console.group('🔍 [Inspect DevTools Staging Array] Current Memory Contents');
  console.table(window.__laboTrackInspectQueue);
  console.groupEnd();
  return window.__laboTrackInspectQueue;
};

// Initial DevTools announcement
console.log(
  '%c🧪 LaboTrack Pro DevTools Inspect Active%c\nOpen the Console to monitor the client-side staging array before database promise resolution.',
  'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;',
  'color: #047857; font-size: 11px; margin-top: 4px;'
);

document.addEventListener('DOMContentLoaded', () => {
  const requestModal = document.getElementById('requestEquipmentModal');
  const modalCloseBtn = document.getElementById('closeModalBtn');
  const modalCancelBtn = document.getElementById('cancelRequestBtn');
  const modalSubmitBtn = document.getElementById('submitRequestBtn');

  // Trigger buttons on asset cards/tables
  document.querySelectorAll('.btn-stage-request').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const assetId = btn.getAttribute('data-asset-id');
      const assetTag = btn.getAttribute('data-asset-tag');
      const assetName = btn.getAttribute('data-asset-name');
      const maxAvailable = parseInt(btn.getAttribute('data-available') || '1', 10);

      // Form item object
      const stagedItem = {
        assetId,
        assetTag,
        assetName,
        quantity: 1,
        maxAvailable,
        stagedAt: new Date().toISOString()
      };

      // Push into client staging array
      window.__laboTrackInspectQueue = [stagedItem];

      // DevTools Inspect Output
      console.group('%c🔍 [Inspect DevTools Staging Array] Asset Added to Memory Queue', 'color: #059669; font-weight: bold;');
      console.info('⚡ Memory State: Staged strictly in browser memory. MongoDB database remains completely UNTOUCHED.');
      console.table(window.__laboTrackInspectQueue);
      console.info('Run `getInspectQueue()` in this console at any time to inspect current staged items.');
      console.groupEnd();

      // Populate modal fields
      if (requestModal) {
        document.getElementById('modalAssetId').value = assetId;
        document.getElementById('modalAssetTag').textContent = assetTag;
        document.getElementById('modalAssetName').textContent = assetName;
        document.getElementById('modalAvailableQty').textContent = maxAvailable;
        document.getElementById('modalQuantity').max = maxAvailable;
        document.getElementById('modalQuantity').value = 1;

        // Default return date to 7 days from now
        const returnDateInput = document.getElementById('modalReturnDate');
        if (returnDateInput) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          returnDateInput.value = nextWeek.toISOString().split('T')[0];
        }

        requestModal.classList.add('open');
        requestModal.style.display = 'flex';
      }
    });
  });

  // Cancel Action: Clears client array without database hit
  function handleCancelRequest() {
    window.__laboTrackInspectQueue = [];
    console.group('%c❌ [Inspect DevTools Staging Array] Requisition Cancelled by User', 'color: #ef4444; font-weight: bold;');
    console.warn('Staged items purged from client memory. Database remains unchanged.');
    console.table(window.__laboTrackInspectQueue);
    console.groupEnd();

    if (requestModal) {
      requestModal.classList.remove('open');
      requestModal.style.display = 'none';
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', handleCancelRequest);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', handleCancelRequest);

  // Prevent default form submit on Enter key, trigger modalSubmitBtn instead
  const stagingForm = document.getElementById('stagingSubmitForm');
  if (stagingForm) {
    stagingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (modalSubmitBtn) modalSubmitBtn.click();
    });
  }

  // Submit Action: Dispatches async Promise to create database record
  if (modalSubmitBtn) {
    modalSubmitBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const assetId = document.getElementById('modalAssetId').value;
      const quantity = parseInt(document.getElementById('modalQuantity').value, 10) || 1;
      const purpose = document.getElementById('modalPurpose').value;
      const returnDate = document.getElementById('modalReturnDate').value;
      const errorBanner = document.getElementById('modalErrorBanner');

      if (!purpose || !purpose.trim()) {
        if (errorBanner) {
          errorBanner.style.display = 'block';
          errorBanner.textContent = 'Please state the research or laboratory purpose.';
        }
        return;
      }

      if (!returnDate) {
        if (errorBanner) {
          errorBanner.style.display = 'block';
          errorBanner.textContent = 'Please select an expected return date.';
        }
        return;
      }

      // Ensure staging queue has current asset item
      if (!window.__laboTrackInspectQueue || window.__laboTrackInspectQueue.length === 0) {
        if (assetId) {
          const assetName = document.getElementById('modalAssetName') ? document.getElementById('modalAssetName').textContent.trim() : 'Equipment Item';
          const assetTag = document.getElementById('modalAssetTag') ? document.getElementById('modalAssetTag').textContent.trim() : '';
          window.__laboTrackInspectQueue = [{
            assetId,
            assetTag,
            assetName,
            quantity,
            purpose,
            expectedReturnDate: returnDate,
            stagedAt: new Date().toISOString()
          }];
        }
      } else {
        window.__laboTrackInspectQueue[0].quantity = quantity;
        window.__laboTrackInspectQueue[0].purpose = purpose;
        window.__laboTrackInspectQueue[0].expectedReturnDate = returnDate;
      }

      console.group('%c⏳ [Inspect DevTools Staging Array] Initiating Async Requisition Promise...', 'color: #3b82f6; font-weight: bold;');
      console.log('Fulfilling Promise: Submitting staged array to server endpoint...');
      console.table(window.__laboTrackInspectQueue);
      console.groupEnd();

      modalSubmitBtn.disabled = true;
      modalSubmitBtn.textContent = 'Submitting...';
      if (errorBanner) errorBanner.style.display = 'none';

      try {
        const response = await fetch('/requests/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            items: window.__laboTrackInspectQueue,
            purpose,
            expectedReturnDate: returnDate
          })
        });

        const contentType = response.headers.get('content-type') || '';
        let data = null;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          if (response.status === 401 || text.includes('log in') || text.includes('login')) {
            throw new Error('Your session has expired. Please refresh the page or sign in.');
          }
          throw new Error(`Server returned unexpected response (status ${response.status}).`);
        }

        if (response.ok && data && data.success) {
          console.group('%c✅ [Inspect DevTools Staging Array] Promise Achieved & Fulfilled!', 'color: #10b981; font-weight: bold;');
          console.log(`Requisition #${data.requestCode} committed to MongoDB.`);
          console.table(data);
          console.groupEnd();

          // Reset client staging queue
          window.__laboTrackInspectQueue = [];

          window.location.href = data.redirectUrl || '/requests/my-requests?msg=Requisition%20placed%20successfully';
        } else {
          throw new Error(data && data.message ? data.message : 'Server could not complete requisition');
        }
      } catch (err) {
        console.group('%c⚠️ [Inspect DevTools Staging Array] Requisition Promise Rejected', 'color: #ef4444; font-weight: bold;');
        console.error('Promise error:', err.message);
        console.groupEnd();

        let displayError = err.message || 'An error occurred while submitting.';
        if (err.name === 'TypeError' && displayError.includes('Failed to fetch')) {
          displayError = 'Unable to connect to the requisition service. Please check your connection or sign in again.';
        }

        if (errorBanner) {
          errorBanner.style.display = 'block';
          errorBanner.textContent = displayError;
        }
        modalSubmitBtn.disabled = false;
        modalSubmitBtn.textContent = 'Confirm & Submit Request';
      }
    });
  }
});
