package com.zeyvo.realtime.chat.infra;

import com.zeyvo.realtime.chat.domain.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {

    Optional<ChatConversation> findByCustomerIdAndTypeAndStatus(UUID customerId, String type, String status);

    Optional<ChatConversation> findByCustomerIdAndOrgIdAndTypeAndStatus(UUID customerId, UUID orgId, String type, String status);

    List<ChatConversation> findByOrgIdAndStatusOrderByUpdatedAtDesc(UUID orgId, String status);

    List<ChatConversation> findByTypeAndStatusOrderByUpdatedAtDesc(String type, String status);

    List<ChatConversation> findByCustomerIdOrderByUpdatedAtDesc(UUID customerId);
}
