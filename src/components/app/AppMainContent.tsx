import { Suspense, lazy } from 'react';

import { AnimatePresence } from 'motion/react';

import { SalesDomain } from '../../domains/sales/components/SalesDomain';
import { AppHeader } from './AppHeader';

const GeneralConfigDomainLazy = lazy(() =>
  import('../../domains/admin-config/components/GeneralConfigDomain').then((mod) => ({ default: mod.GeneralConfigDomain }))
);
const ConfigSectionLazy = lazy(() =>
  import('../config/ConfigSection').then((mod) => ({ default: mod.ConfigSection }))
);
const HistorySectionLazy = lazy(() =>
  import('../history/HistorySection').then((mod) => ({ default: mod.HistorySection }))
);
const ResultsDomainLazy = lazy(() =>
  import('../../domains/results/components/ResultsDomain').then((mod) => ({ default: mod.ResultsDomain }))
);
const UsersDomainLazy = lazy(() =>
  import('../../domains/users/components/UsersDomain').then((mod) => ({ default: mod.UsersDomain }))
);
const ArchiveDomainLazy = lazy(() =>
  import('../../domains/archive/components/ArchiveDomain').then((mod) => ({ default: mod.ArchiveDomain }))
);
const LiquidationDomainLazy = lazy(() =>
  import('../../domains/liquidation/components/LiquidationDomain').then((mod) => ({ default: mod.LiquidationDomain }))
);
const CierresDomainLazy = lazy(() =>
  import('../../domains/cierres/components/CierresDomain').then((mod) => ({ default: mod.CierresDomain }))
);
const DashboardStatsDomainLazy = lazy(() =>
  import('../../domains/dashboard-stats/components/DashboardStatsDomain').then((mod) => ({ default: mod.DashboardStatsDomain }))
);

export function AppMainContent(props: any) {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    todayStats,
    handleLogoutFromUi,
    mainScrollRef,
    handleMainTouchStart,
    handleMainTouchMove,
    handleMainTouchEnd,
    activeTab,
    canAccessDashboard,
    canAccessStats,
    canAccessCierres,
    canAccessResults,
    canAccessAdminConfig,
    canAccessUsers,
    canAccessLiquidation,
    canAccessArchive,
    todayStr,
    userProfile,
    injections,
    results,
    users,
    userStats,
    operationalSellerId,
    historyTickets,
    ticketMatchesGlobalChancePrice,
    lotteries,
    reportLotteries,
    cleanText,
    formatTime12h,
    dailyAuditLogs,
    appAlerts,
    appAlertsLoading,
    onUnpinAppAlert,
    isMultipleMode,
    setIsMultipleMode,
    showMultiSelect,
    setShowMultiSelect,
    multiLottery,
    setMultiLottery,
    activeLotteries,
    lotteriesLoading,
    selectedLottery,
    setSelectedLottery,
    globalSettings,
    betType,
    setBetType,
    setNumber,
    setQuantity,
    setPlAmount,
    setFocusedField,
    findActiveLotteryByName,
    focusedField,
    numberInputRef,
    amountInputRef,
    number,
    quantity,
    plAmount,
    amountEntryStarted,
    setAmountEntryStarted,
    handleKeyPress,
    handleBackspace,
    handleClear,
    addToCart,
    canSell,
    salesAccessError,
    cart,
    clearCart,
    updateCartItemQuantity,
    updateCartItemAmount,
    removeFromCart,
    chancePrice,
    editingTicketId,
    cancelEdit,
    cartTotal,
    handleSell,
    setShowFastEntryModal,
    isSpecial4DSelected,
    special4DUnitPrice,
    historyDate,
    setHistoryDate,
    applyOperationalQuickDate,
    recentOperationalDates,
    historyFilter,
    setHistoryFilter,
    selectedUserToLiquidate,
    setSelectedUserToLiquidate,
    selectedManageUserEmail,
    setSelectedManageUserEmail,
    showGlobalScope,
    setShowGlobalScope,
    canUseGlobalScope,
    historyLotteryCards,
    filteredTickets,
    getTicketPrizes,
    setExpandedLotteries,
    expandedLotteries,
    setLotteryPages,
    isLotteryOpenForSales,
    historyTypeFilterCode,
    sortedLotteries,
    setShowTicketModal,
    cancelTicket,
    isTicketClosed,
    isTicketHasResults,
    user,
    editTicket,
    reuseTicket,
    setShowUserModal,
    setEditingUser,
    setShowInjectionModal,
    setInjectionTargetUserEmail,
    setInjectionDefaultType,
    setIsInjectionOnly,
    canManageResults,
    businessDayKey,
    setEditingResult,
    deleteResult,
    availableResultLotteries,
    setActiveTab,
    canAccessAllUsers,
    globalChancePriceFilter,
    setGlobalChancePriceFilter,
    shareImageDataUrl,
    downloadDataUrlFile,
    editingResult,
    cancelResultEdition,
    setResultFormLotteryId,
    resultFormLotteryId,
    lotteryById,
    resultFormFirstPrize,
    setResultFormFirstPrize,
    resultFormSecondPrize,
    setResultFormSecondPrize,
    resultFormThirdPrize,
    setResultFormThirdPrize,
    handleCreateResultFromForm,
    visibleResults,
    resultStatusMap,
    getResultKey,
    setShowSettingsModal,
    setEditingLottery,
    setShowLotteryModal,
    toggleLotteryActive,
    deleteLottery,
    setGlobalSettings,
    handleDeleteAllSalesData,
    deleteUser,
    canMutateInjection,
    updateInjectionAmount,
    deleteInjection,
    sendUserMessage,
    isPrimaryCeoUser,
    setConsolidatedMode,
    consolidatedMode,
    consolidatedReportDate,
    setConsolidatedReportDate,
    setConsolidatedStartDate,
    setConsolidatedEndDate,
    consolidatedStartDate,
    consolidatedEndDate,
    generateConsolidatedReport,
    isGeneratingYesterdayReport,
    liquidationDate,
    setLiquidationDate,
    liquidacionQuickDateOptions,
    isLiquidationDataLoading,
    liquidationUsers,
    selectedLiquidationSettlement,
    liquidationGlobalSummary,
    liquidationUserSummaries,
    liquidationRangeStartDate,
    setLiquidationRangeStartDate,
    liquidationRangeEndDate,
    setLiquidationRangeEndDate,
    liquidationRangeReport,
    isLiquidationRangeLoading,
    fetchLiquidationRangeReport,
    amountPaid,
    setAmountPaid,
    amountDirection,
    setAmountDirection,
    handleLiquidate,
    handleLiquidateRange,
    liquidationPreview,
    archiveDate,
    setArchiveDate,
    archiveUserEmail,
    setArchiveUserEmail,
    fetchArchiveData,
    isArchiveLoading,
    archiveTickets,
    archiveInjections,
    auditLogsLoading,
    refreshAuditLogs,
    buildFinancialSummary,
    fetchArchiveSalesReport,
    searchArchiveTickets,
    fetchArchiveLiquidations,
    handleUpdateChancePrice,
    personalChancePrice,
    setPersonalChancePrice,
    canUpdatePersonalChancePrice,
    isUpdatingChancePrice,
    isUpdatingSpecial4dPreference,
    requestSpecial4dPreferenceChange,
    handleUpdatePassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isUpdatingPassword,
  } = props;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
      <AppHeader
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        todayStats={todayStats}
        handleLogoutFromUi={handleLogoutFromUi}
      />

      <main
        ref={(node) => {
          mainScrollRef.current = node;
        }}
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-8 custom-scrollbar min-w-0"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && canAccessDashboard && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando dashboard...</div>}>
              <DashboardStatsDomainLazy
                mode="dashboard"
                todayStats={todayStats}
                todayStr={todayStr}
                user={user}
                userProfile={userProfile}
                injections={injections}
                results={results}
                users={users}
                userStats={userStats}
                operationalSellerId={operationalSellerId}
                historyTickets={historyTickets}
                ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                lotteries={reportLotteries || lotteries}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                auditLogs={dailyAuditLogs}
                appAlerts={appAlerts}
                appAlertsLoading={appAlertsLoading}
                onUnpinAppAlert={onUnpinAppAlert}
              />
            </Suspense>
          )}

          {activeTab === 'sales' && (
            <SalesDomain
              isMultipleMode={isMultipleMode}
              setIsMultipleMode={setIsMultipleMode}
              showMultiSelect={showMultiSelect}
              setShowMultiSelect={setShowMultiSelect}
              multiLottery={multiLottery}
              setMultiLottery={setMultiLottery}
              activeLotteries={activeLotteries}
              lotteriesLoading={lotteriesLoading}
              selectedLottery={selectedLottery}
              setSelectedLottery={setSelectedLottery}
              cleanText={cleanText}
              formatTime12h={formatTime12h}
              globalSettings={globalSettings}
              betType={betType}
              setBetType={setBetType}
              setNumber={setNumber}
              setQuantity={setQuantity}
              setPlAmount={setPlAmount}
              setFocusedField={setFocusedField}
              findActiveLotteryByName={findActiveLotteryByName}
              focusedField={focusedField}
              numberInputRef={numberInputRef}
              amountInputRef={amountInputRef}
              number={number}
              quantity={quantity}
              plAmount={plAmount}
              amountEntryStarted={amountEntryStarted}
              setAmountEntryStarted={setAmountEntryStarted}
              handleKeyPress={handleKeyPress}
              handleBackspace={handleBackspace}
              handleClear={handleClear}
              addToCart={addToCart}
              canSell={canSell}
              sellBlockedReason={salesAccessError}
              cart={cart}
              clearCart={clearCart}
              updateCartItemQuantity={updateCartItemQuantity}
              updateCartItemAmount={updateCartItemAmount}
              removeFromCart={removeFromCart}
              chancePrice={chancePrice}
              editingTicketId={editingTicketId}
              cancelEdit={cancelEdit}
              cartTotal={cartTotal}
              handleSell={handleSell}
              setShowFastEntryModal={setShowFastEntryModal}
              isSpecial4DSelected={isSpecial4DSelected}
              special4DUnitPrice={special4DUnitPrice}
              userProfile={userProfile}
              todayStr={todayStr}
              todayStats={todayStats}
            />
          )}
          {activeTab === 'history' && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando historial...</div>}>
              <HistorySectionLazy
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                historyLotteryCards={historyLotteryCards}
                filteredTickets={filteredTickets}
                getTicketPrizes={getTicketPrizes}
                setExpandedLotteries={setExpandedLotteries}
                expandedLotteries={expandedLotteries}
                setLotteryPages={setLotteryPages}
                isLotteryOpenForSales={isLotteryOpenForSales}
                historyTypeFilterCode={historyTypeFilterCode}
                formatTime12h={formatTime12h}
                setShowTicketModal={setShowTicketModal}
                cancelTicket={cancelTicket}
                isTicketClosed={isTicketClosed}
                isTicketHasResults={isTicketHasResults}
                user={user}
                userProfile={userProfile}
                operationalSellerId={operationalSellerId}
                editTicket={editTicket}
                reuseTicket={reuseTicket}
              />
            </Suspense>
          )}
          {activeTab === 'stats' && canAccessStats && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando estadisticas...</div>}>
              <DashboardStatsDomainLazy
                mode="stats"
                canUseGlobalScope={canUseGlobalScope}
                showGlobalScope={showGlobalScope}
                setShowGlobalScope={setShowGlobalScope}
                canAccessAllUsers={canAccessAllUsers}
                globalChancePriceFilter={globalChancePriceFilter}
                setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                globalSettings={globalSettings}
                historyDate={historyDate}
                setHistoryDate={setHistoryDate}
                historyTickets={historyTickets}
                ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                lotteries={reportLotteries || lotteries}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                injections={injections}
                todayStr={todayStr}
                operationalSellerId={operationalSellerId}
              />
            </Suspense>
          )}

          {activeTab === 'cierres' && canAccessCierres && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando cierres...</div>}>
              <CierresDomainLazy
                canUseGlobalScope={canUseGlobalScope}
                showGlobalScope={showGlobalScope}
                setShowGlobalScope={setShowGlobalScope}
                canAccessAllUsers={canAccessAllUsers}
                globalChancePriceFilter={globalChancePriceFilter}
                setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                globalSettings={globalSettings}
                historyDate={historyDate}
                setHistoryDate={setHistoryDate}
                lotteries={reportLotteries || lotteries}
                cleanText={cleanText}
                userProfile={userProfile}
                user={user}
                formatTime12h={formatTime12h}
                historyTickets={historyTickets}
                operationalSellerId={operationalSellerId}
                ticketMatchesGlobalChancePrice={ticketMatchesGlobalChancePrice}
                shareImageDataUrl={shareImageDataUrl}
                downloadDataUrlFile={downloadDataUrlFile}
              />
            </Suspense>
          )}

          {activeTab === 'results' && canAccessResults && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando resultados...</div>}>
              <ResultsDomainLazy
                canManageResults={canManageResults}
                editingResult={editingResult}
                cancelResultEdition={cancelResultEdition}
                setResultFormLotteryId={setResultFormLotteryId}
                businessDayKey={businessDayKey}
                resultFormLotteryId={resultFormLotteryId}
                availableResultLotteries={availableResultLotteries}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
                lotteryById={lotteryById}
                resultFormFirstPrize={resultFormFirstPrize}
                setResultFormFirstPrize={setResultFormFirstPrize}
                resultFormSecondPrize={resultFormSecondPrize}
                setResultFormSecondPrize={setResultFormSecondPrize}
                resultFormThirdPrize={resultFormThirdPrize}
                setResultFormThirdPrize={setResultFormThirdPrize}
                handleCreateResultFromForm={handleCreateResultFromForm}
                visibleResults={visibleResults}
                resultStatusMap={resultStatusMap}
                getResultKey={getResultKey}
                setEditingResult={setEditingResult}
                deleteResult={deleteResult}
              />
            </Suspense>
          )}
          {activeTab === 'admin' && canAccessAdminConfig && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando ajustes...</div>}>
              <GeneralConfigDomainLazy
                userProfile={userProfile}
                isPrimaryCeoUser={isPrimaryCeoUser}
                setShowSettingsModal={setShowSettingsModal}
                setEditingLottery={setEditingLottery}
                setShowLotteryModal={setShowLotteryModal}
                sortedLotteries={sortedLotteries}
                formatTime12h={formatTime12h}
                cleanText={cleanText}
                toggleLotteryActive={toggleLotteryActive}
                setEditingResult={setEditingResult}
                setEditingUser={setEditingUser}
                setShowUserModal={setShowUserModal}
                deleteLottery={deleteLottery}
                globalSettings={globalSettings}
                setGlobalChancePriceFilter={setGlobalChancePriceFilter}
                globalChancePriceFilter={globalChancePriceFilter}
                setGlobalSettings={setGlobalSettings}
                showGlobalScope={showGlobalScope}
                setShowGlobalScope={setShowGlobalScope}
                handleDeleteAllSalesData={handleDeleteAllSalesData}
              />
            </Suspense>
          )}
          {activeTab === 'users' && canAccessUsers && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando usuarios...</div>}>
              <UsersDomainLazy
                selectedManageUserEmail={selectedManageUserEmail}
                setSelectedManageUserEmail={setSelectedManageUserEmail}
                users={users}
                userProfile={userProfile}
                isPrimaryCeoUser={isPrimaryCeoUser}
                userStats={userStats}
                setEditingUser={setEditingUser}
                setShowUserModal={setShowUserModal}
                setInjectionTargetUserEmail={setInjectionTargetUserEmail}
                setInjectionDefaultType={setInjectionDefaultType}
                setIsInjectionOnly={setIsInjectionOnly}
                setShowInjectionModal={setShowInjectionModal}
                deleteUser={deleteUser}
                injections={injections}
                businessDayKey={businessDayKey}
                canMutateInjection={canMutateInjection}
                updateInjectionAmount={updateInjectionAmount}
                deleteInjection={deleteInjection}
                sendUserMessage={sendUserMessage}
              />
            </Suspense>
          )}
          {activeTab === 'liquidaciones' && canAccessLiquidation && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando liquidaciones...</div>}>
              <LiquidationDomainLazy
                isPrimaryCeoUser={isPrimaryCeoUser}
                setConsolidatedMode={setConsolidatedMode}
                consolidatedMode={consolidatedMode}
                consolidatedReportDate={consolidatedReportDate}
                setConsolidatedReportDate={setConsolidatedReportDate}
                setConsolidatedStartDate={setConsolidatedStartDate}
                setConsolidatedEndDate={setConsolidatedEndDate}
                consolidatedStartDate={consolidatedStartDate}
                consolidatedEndDate={consolidatedEndDate}
                recentOperationalDates={recentOperationalDates}
                generateConsolidatedReport={generateConsolidatedReport}
                isGeneratingYesterdayReport={isGeneratingYesterdayReport}
                liquidationDate={liquidationDate}
                setLiquidationDate={setLiquidationDate}
                applyOperationalQuickDate={applyOperationalQuickDate}
                liquidacionQuickDateOptions={liquidacionQuickDateOptions}
                businessDayKey={businessDayKey}
                isLiquidationDataLoading={isLiquidationDataLoading}
                userProfile={userProfile}
                selectedUserToLiquidate={selectedUserToLiquidate}
                setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                users={liquidationUsers}
                selectedLiquidationSettlement={selectedLiquidationSettlement}
                liquidationGlobalSummary={liquidationGlobalSummary}
                liquidationUserSummaries={liquidationUserSummaries}
                liquidationRangeStartDate={liquidationRangeStartDate}
                setLiquidationRangeStartDate={setLiquidationRangeStartDate}
                liquidationRangeEndDate={liquidationRangeEndDate}
                setLiquidationRangeEndDate={setLiquidationRangeEndDate}
                liquidationRangeReport={liquidationRangeReport}
                isLiquidationRangeLoading={isLiquidationRangeLoading}
                fetchLiquidationRangeReport={fetchLiquidationRangeReport}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                amountDirection={amountDirection}
                setAmountDirection={setAmountDirection}
                handleLiquidate={handleLiquidate}
                handleLiquidateRange={handleLiquidateRange}
                liquidationPreview={liquidationPreview}
                shareImageDataUrl={shareImageDataUrl}
                downloadDataUrlFile={downloadDataUrlFile}
              />
            </Suspense>
          )}
          {activeTab === 'archivo' && canAccessArchive && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando archivo...</div>}>
              <ArchiveDomainLazy
                archiveDate={archiveDate}
                setArchiveDate={setArchiveDate}
                applyOperationalQuickDate={applyOperationalQuickDate}
                recentOperationalDates={recentOperationalDates}
                userProfile={userProfile}
                archiveUserEmail={archiveUserEmail}
                setArchiveUserEmail={setArchiveUserEmail}
                users={users}
                fetchArchiveData={fetchArchiveData}
                isArchiveLoading={isArchiveLoading}
                archiveTickets={archiveTickets}
                archiveInjections={archiveInjections}
                auditLogs={dailyAuditLogs}
                auditLogsLoading={auditLogsLoading}
                refreshAuditLogs={refreshAuditLogs}
                buildFinancialSummary={buildFinancialSummary}
                fetchArchiveSalesReport={fetchArchiveSalesReport}
                searchArchiveTickets={searchArchiveTickets}
                fetchArchiveLiquidations={fetchArchiveLiquidations}
                setSelectedUserToLiquidate={setSelectedUserToLiquidate}
                setLiquidationDate={setLiquidationDate}
                setActiveTab={setActiveTab}
                setShowTicketModal={setShowTicketModal}
                cleanText={cleanText}
                formatTime12h={formatTime12h}
              />
            </Suspense>
          )}
          {activeTab === 'config' && (
            <Suspense fallback={<div className="text-xs text-muted-foreground">Cargando cuenta...</div>}>
              <ConfigSectionLazy
                handleUpdateChancePrice={handleUpdateChancePrice}
                personalChancePrice={personalChancePrice}
                setPersonalChancePrice={setPersonalChancePrice}
                globalSettings={globalSettings}
                canUpdatePersonalChancePrice={canUpdatePersonalChancePrice}
                isUpdatingChancePrice={isUpdatingChancePrice}
                userProfile={userProfile}
                isUpdatingSpecial4dPreference={isUpdatingSpecial4dPreference}
                requestSpecial4dPreferenceChange={requestSpecial4dPreferenceChange}
                handleUpdatePassword={handleUpdatePassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                isUpdatingPassword={isUpdatingPassword}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-auto min-h-12 surface-dark border-t border-border px-3 sm:px-8 py-2 flex items-center justify-between gap-2 shrink-0 text-[8px] sm:text-[9px] font-mono text-muted-foreground uppercase tracking-[0.12em] sm:tracking-[0.2em]">
        <p>© 2026 CHANCE PRO SYSTEMS • TERMINAL {user.uid.slice(0, 8)}</p>
        <div className="flex gap-3 sm:gap-8 flex-wrap justify-end">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> SERVER: OK</span>
          <span>V1.2.0-STABLE</span>
        </div>
      </footer>
    </div>
  );
}
