package com.zeyvo.queue.service;

import org.springframework.stereotype.Service;

/**
 * ETA estimate: ahead_tickets * avg_service_minutes / open_windows.
 * Phase 2 will swap this for a calibrated per-(branch,service,hour) model.
 */
@Service
public class HeuristicEtaEstimator {

    public int estimateMinutes(int ticketsAhead, double avgServiceMinutes, int openWindows) {
        if (ticketsAhead <= 0) return 0;
        int windows = Math.max(1, openWindows);
        return (int) Math.max(0, Math.round((ticketsAhead * avgServiceMinutes) / windows));
    }
}
