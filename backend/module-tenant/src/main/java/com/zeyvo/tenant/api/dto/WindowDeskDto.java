package com.zeyvo.tenant.api.dto;

import com.zeyvo.tenant.domain.WindowDesk;

import java.util.UUID;

public record WindowDeskDto(
        UUID id,
        UUID branchId,
        int number,
        String label,
        String status,
        UUID operatorId,
        UUID servingTicket,
        String[] serviceCodes
) {
    public static WindowDeskDto from(WindowDesk w) {
        return new WindowDeskDto(w.getId(), w.getBranchId(), w.getNumber(),
                w.getLabel(), w.getStatus(), w.getOperatorId(),
                w.getServingTicket(), w.getServiceCodes());
    }
}
