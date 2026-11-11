// The identity your backend returns for the signed-in user. The user_hash is
// computed on the server with the widget's identity secret (see the
// node-express, go-server or php-plain examples); the secret never ships here.
import 'dart:convert';

import 'package:clickfix_webview/clickfix_webview.dart';
import 'package:http/http.dart' as http;

import 'config.dart';

class SupportSession {
  const SupportSession({
    required this.userId,
    required this.userHash,
    this.name,
    this.email,
    this.companyId,
    this.companyName,
  });

  factory SupportSession.fromJson(Map<String, Object?> json) {
    final company = json['company'];
    return SupportSession(
      userId: json['user_id'] as String,
      userHash: json['user_hash'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      companyId: company is Map ? company['id'] as String? : null,
      companyName: company is Map ? company['name'] as String? : null,
    );
  }

  final String userId;
  final String userHash;
  final String? name;
  final String? email;
  final String? companyId;
  final String? companyName;

  /// What the bridge sends as `clickfix:identify`. With [companyId] the hash
  /// from the server must sign user id and company id together.
  ClickFixIdentity toIdentity() => ClickFixIdentity(
    userId: userId,
    userHash: userHash,
    name: name,
    email: email,
    company: companyId == null
        ? null
        : ClickFixCompany(id: companyId, name: companyName),
  );
}

/// GET $apiUrl/api/support-session (add your own auth header here).
Future<SupportSession> fetchSupportSession({http.Client? client}) async {
  final response = await (client ?? http.Client()).get(
    Uri.parse('$apiUrl/api/support-session'),
  );
  if (response.statusCode != 200) {
    throw Exception('support-session failed: HTTP ${response.statusCode}');
  }
  return SupportSession.fromJson(
    jsonDecode(response.body) as Map<String, Object?>,
  );
}
