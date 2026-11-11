import 'package:clickfix_flutter_example/support_session.dart';
import 'package:clickfix_webview/clickfix_webview.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('support session maps to a bridge identity with the company', () {
    final session = SupportSession.fromJson({
      'user_id': '1001',
      'user_hash': 'a' * 64,
      'name': 'Ayşe Yılmaz',
      'email': 'ayse@example.com',
      'company': {'id': 'F-77', 'name': 'Acme A.Ş.'},
    });
    final json = session.toIdentity().toJson();
    expect(json['user_id'], '1001');
    expect(json['user_hash'], 'a' * 64);
    expect((json['company'] as Map)['id'], 'F-77');
  });

  test('controller builds the embed URL with the deep-linked conversation', () {
    final controller = ClickFixController(
      widgetId: 'WIDGET_ID',
      locale: 'tr',
      conversation: '11111111-2222-4333-8444-555555555555',
      consent: true,
    );
    final uri = controller.embedUri;
    expect(uri.origin, defaultClickFixOrigin);
    expect(uri.path, '/widget-embed.html');
    expect(uri.queryParameters['widget'], 'WIDGET_ID');
    expect(
      uri.queryParameters['conversation'],
      '11111111-2222-4333-8444-555555555555',
    );
    expect(uri.queryParameters['consent'], '1');
    controller.dispose();
  });
}
