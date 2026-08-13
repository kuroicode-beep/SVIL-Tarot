// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'database.dart';

// ignore_for_file: type=lint
class $HistoryRowsTable extends HistoryRows
    with TableInfo<$HistoryRowsTable, HistoryRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HistoryRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _customerIdMeta = const VerificationMeta(
    'customerId',
  );
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
    'customer_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _outcomeMeta = const VerificationMeta(
    'outcome',
  );
  @override
  late final GeneratedColumn<String> outcome = GeneratedColumn<String>(
    'outcome',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    kind,
    createdAt,
    customerId,
    outcome,
    payload,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'history_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<HistoryRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('kind')) {
      context.handle(
        _kindMeta,
        kind.isAcceptableOrUnknown(data['kind']!, _kindMeta),
      );
    } else if (isInserting) {
      context.missing(_kindMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('customer_id')) {
      context.handle(
        _customerIdMeta,
        customerId.isAcceptableOrUnknown(data['customer_id']!, _customerIdMeta),
      );
    }
    if (data.containsKey('outcome')) {
      context.handle(
        _outcomeMeta,
        outcome.isAcceptableOrUnknown(data['outcome']!, _outcomeMeta),
      );
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  HistoryRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return HistoryRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      kind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}kind'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}created_at'],
      )!,
      customerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}customer_id'],
      ),
      outcome: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}outcome'],
      ),
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $HistoryRowsTable createAlias(String alias) {
    return $HistoryRowsTable(attachedDatabase, alias);
  }
}

class HistoryRow extends DataClass implements Insertable<HistoryRow> {
  final String id;
  final String kind;
  final String createdAt;
  final String? customerId;
  final String? outcome;

  /// 레코드 원본 JSON. 백업 모양의 정본이다.
  final String payload;
  const HistoryRow({
    required this.id,
    required this.kind,
    required this.createdAt,
    this.customerId,
    this.outcome,
    required this.payload,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['kind'] = Variable<String>(kind);
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || customerId != null) {
      map['customer_id'] = Variable<String>(customerId);
    }
    if (!nullToAbsent || outcome != null) {
      map['outcome'] = Variable<String>(outcome);
    }
    map['payload'] = Variable<String>(payload);
    return map;
  }

  HistoryRowsCompanion toCompanion(bool nullToAbsent) {
    return HistoryRowsCompanion(
      id: Value(id),
      kind: Value(kind),
      createdAt: Value(createdAt),
      customerId: customerId == null && nullToAbsent
          ? const Value.absent()
          : Value(customerId),
      outcome: outcome == null && nullToAbsent
          ? const Value.absent()
          : Value(outcome),
      payload: Value(payload),
    );
  }

  factory HistoryRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return HistoryRow(
      id: serializer.fromJson<String>(json['id']),
      kind: serializer.fromJson<String>(json['kind']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      customerId: serializer.fromJson<String?>(json['customerId']),
      outcome: serializer.fromJson<String?>(json['outcome']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'kind': serializer.toJson<String>(kind),
      'createdAt': serializer.toJson<String>(createdAt),
      'customerId': serializer.toJson<String?>(customerId),
      'outcome': serializer.toJson<String?>(outcome),
      'payload': serializer.toJson<String>(payload),
    };
  }

  HistoryRow copyWith({
    String? id,
    String? kind,
    String? createdAt,
    Value<String?> customerId = const Value.absent(),
    Value<String?> outcome = const Value.absent(),
    String? payload,
  }) => HistoryRow(
    id: id ?? this.id,
    kind: kind ?? this.kind,
    createdAt: createdAt ?? this.createdAt,
    customerId: customerId.present ? customerId.value : this.customerId,
    outcome: outcome.present ? outcome.value : this.outcome,
    payload: payload ?? this.payload,
  );
  HistoryRow copyWithCompanion(HistoryRowsCompanion data) {
    return HistoryRow(
      id: data.id.present ? data.id.value : this.id,
      kind: data.kind.present ? data.kind.value : this.kind,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      customerId: data.customerId.present
          ? data.customerId.value
          : this.customerId,
      outcome: data.outcome.present ? data.outcome.value : this.outcome,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('HistoryRow(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('createdAt: $createdAt, ')
          ..write('customerId: $customerId, ')
          ..write('outcome: $outcome, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, kind, createdAt, customerId, outcome, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is HistoryRow &&
          other.id == this.id &&
          other.kind == this.kind &&
          other.createdAt == this.createdAt &&
          other.customerId == this.customerId &&
          other.outcome == this.outcome &&
          other.payload == this.payload);
}

class HistoryRowsCompanion extends UpdateCompanion<HistoryRow> {
  final Value<String> id;
  final Value<String> kind;
  final Value<String> createdAt;
  final Value<String?> customerId;
  final Value<String?> outcome;
  final Value<String> payload;
  final Value<int> rowid;
  const HistoryRowsCompanion({
    this.id = const Value.absent(),
    this.kind = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.customerId = const Value.absent(),
    this.outcome = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HistoryRowsCompanion.insert({
    required String id,
    required String kind,
    required String createdAt,
    this.customerId = const Value.absent(),
    this.outcome = const Value.absent(),
    required String payload,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       kind = Value(kind),
       createdAt = Value(createdAt),
       payload = Value(payload);
  static Insertable<HistoryRow> custom({
    Expression<String>? id,
    Expression<String>? kind,
    Expression<String>? createdAt,
    Expression<String>? customerId,
    Expression<String>? outcome,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (kind != null) 'kind': kind,
      if (createdAt != null) 'created_at': createdAt,
      if (customerId != null) 'customer_id': customerId,
      if (outcome != null) 'outcome': outcome,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HistoryRowsCompanion copyWith({
    Value<String>? id,
    Value<String>? kind,
    Value<String>? createdAt,
    Value<String?>? customerId,
    Value<String?>? outcome,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return HistoryRowsCompanion(
      id: id ?? this.id,
      kind: kind ?? this.kind,
      createdAt: createdAt ?? this.createdAt,
      customerId: customerId ?? this.customerId,
      outcome: outcome ?? this.outcome,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (outcome.present) {
      map['outcome'] = Variable<String>(outcome.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HistoryRowsCompanion(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('createdAt: $createdAt, ')
          ..write('customerId: $customerId, ')
          ..write('outcome: $outcome, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CustomerRowsTable extends CustomerRows
    with TableInfo<$CustomerRowsTable, CustomerRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CustomerRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, updatedAt, payload];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'customer_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<CustomerRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CustomerRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CustomerRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}updated_at'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $CustomerRowsTable createAlias(String alias) {
    return $CustomerRowsTable(attachedDatabase, alias);
  }
}

class CustomerRow extends DataClass implements Insertable<CustomerRow> {
  final String id;
  final String name;
  final String updatedAt;
  final String payload;
  const CustomerRow({
    required this.id,
    required this.name,
    required this.updatedAt,
    required this.payload,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    map['updated_at'] = Variable<String>(updatedAt);
    map['payload'] = Variable<String>(payload);
    return map;
  }

  CustomerRowsCompanion toCompanion(bool nullToAbsent) {
    return CustomerRowsCompanion(
      id: Value(id),
      name: Value(name),
      updatedAt: Value(updatedAt),
      payload: Value(payload),
    );
  }

  factory CustomerRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CustomerRow(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      updatedAt: serializer.fromJson<String>(json['updatedAt']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'updatedAt': serializer.toJson<String>(updatedAt),
      'payload': serializer.toJson<String>(payload),
    };
  }

  CustomerRow copyWith({
    String? id,
    String? name,
    String? updatedAt,
    String? payload,
  }) => CustomerRow(
    id: id ?? this.id,
    name: name ?? this.name,
    updatedAt: updatedAt ?? this.updatedAt,
    payload: payload ?? this.payload,
  );
  CustomerRow copyWithCompanion(CustomerRowsCompanion data) {
    return CustomerRow(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CustomerRow(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, updatedAt, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CustomerRow &&
          other.id == this.id &&
          other.name == this.name &&
          other.updatedAt == this.updatedAt &&
          other.payload == this.payload);
}

class CustomerRowsCompanion extends UpdateCompanion<CustomerRow> {
  final Value<String> id;
  final Value<String> name;
  final Value<String> updatedAt;
  final Value<String> payload;
  final Value<int> rowid;
  const CustomerRowsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CustomerRowsCompanion.insert({
    required String id,
    required String name,
    required String updatedAt,
    required String payload,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name),
       updatedAt = Value(updatedAt),
       payload = Value(payload);
  static Insertable<CustomerRow> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? updatedAt,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CustomerRowsCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String>? updatedAt,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return CustomerRowsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      updatedAt: updatedAt ?? this.updatedAt,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CustomerRowsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ConsultationRowsTable extends ConsultationRows
    with TableInfo<$ConsultationRowsTable, ConsultationRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ConsultationRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _customerIdMeta = const VerificationMeta(
    'customerId',
  );
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
    'customer_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _serviceTypeMeta = const VerificationMeta(
    'serviceType',
  );
  @override
  late final GeneratedColumn<String> serviceType = GeneratedColumn<String>(
    'service_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dueAtMeta = const VerificationMeta('dueAt');
  @override
  late final GeneratedColumn<String> dueAt = GeneratedColumn<String>(
    'due_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    customerId,
    serviceType,
    createdAt,
    dueAt,
    status,
    payload,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'consultation_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<ConsultationRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('customer_id')) {
      context.handle(
        _customerIdMeta,
        customerId.isAcceptableOrUnknown(data['customer_id']!, _customerIdMeta),
      );
    } else if (isInserting) {
      context.missing(_customerIdMeta);
    }
    if (data.containsKey('service_type')) {
      context.handle(
        _serviceTypeMeta,
        serviceType.isAcceptableOrUnknown(
          data['service_type']!,
          _serviceTypeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_serviceTypeMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('due_at')) {
      context.handle(
        _dueAtMeta,
        dueAt.isAcceptableOrUnknown(data['due_at']!, _dueAtMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ConsultationRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ConsultationRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      customerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}customer_id'],
      )!,
      serviceType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}service_type'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}created_at'],
      )!,
      dueAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}due_at'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      ),
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $ConsultationRowsTable createAlias(String alias) {
    return $ConsultationRowsTable(attachedDatabase, alias);
  }
}

class ConsultationRow extends DataClass implements Insertable<ConsultationRow> {
  final String id;
  final String customerId;
  final String serviceType;
  final String createdAt;
  final String? dueAt;
  final String? status;
  final String payload;
  const ConsultationRow({
    required this.id,
    required this.customerId,
    required this.serviceType,
    required this.createdAt,
    this.dueAt,
    this.status,
    required this.payload,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['customer_id'] = Variable<String>(customerId);
    map['service_type'] = Variable<String>(serviceType);
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || dueAt != null) {
      map['due_at'] = Variable<String>(dueAt);
    }
    if (!nullToAbsent || status != null) {
      map['status'] = Variable<String>(status);
    }
    map['payload'] = Variable<String>(payload);
    return map;
  }

  ConsultationRowsCompanion toCompanion(bool nullToAbsent) {
    return ConsultationRowsCompanion(
      id: Value(id),
      customerId: Value(customerId),
      serviceType: Value(serviceType),
      createdAt: Value(createdAt),
      dueAt: dueAt == null && nullToAbsent
          ? const Value.absent()
          : Value(dueAt),
      status: status == null && nullToAbsent
          ? const Value.absent()
          : Value(status),
      payload: Value(payload),
    );
  }

  factory ConsultationRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ConsultationRow(
      id: serializer.fromJson<String>(json['id']),
      customerId: serializer.fromJson<String>(json['customerId']),
      serviceType: serializer.fromJson<String>(json['serviceType']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      dueAt: serializer.fromJson<String?>(json['dueAt']),
      status: serializer.fromJson<String?>(json['status']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'customerId': serializer.toJson<String>(customerId),
      'serviceType': serializer.toJson<String>(serviceType),
      'createdAt': serializer.toJson<String>(createdAt),
      'dueAt': serializer.toJson<String?>(dueAt),
      'status': serializer.toJson<String?>(status),
      'payload': serializer.toJson<String>(payload),
    };
  }

  ConsultationRow copyWith({
    String? id,
    String? customerId,
    String? serviceType,
    String? createdAt,
    Value<String?> dueAt = const Value.absent(),
    Value<String?> status = const Value.absent(),
    String? payload,
  }) => ConsultationRow(
    id: id ?? this.id,
    customerId: customerId ?? this.customerId,
    serviceType: serviceType ?? this.serviceType,
    createdAt: createdAt ?? this.createdAt,
    dueAt: dueAt.present ? dueAt.value : this.dueAt,
    status: status.present ? status.value : this.status,
    payload: payload ?? this.payload,
  );
  ConsultationRow copyWithCompanion(ConsultationRowsCompanion data) {
    return ConsultationRow(
      id: data.id.present ? data.id.value : this.id,
      customerId: data.customerId.present
          ? data.customerId.value
          : this.customerId,
      serviceType: data.serviceType.present
          ? data.serviceType.value
          : this.serviceType,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      dueAt: data.dueAt.present ? data.dueAt.value : this.dueAt,
      status: data.status.present ? data.status.value : this.status,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ConsultationRow(')
          ..write('id: $id, ')
          ..write('customerId: $customerId, ')
          ..write('serviceType: $serviceType, ')
          ..write('createdAt: $createdAt, ')
          ..write('dueAt: $dueAt, ')
          ..write('status: $status, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    customerId,
    serviceType,
    createdAt,
    dueAt,
    status,
    payload,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ConsultationRow &&
          other.id == this.id &&
          other.customerId == this.customerId &&
          other.serviceType == this.serviceType &&
          other.createdAt == this.createdAt &&
          other.dueAt == this.dueAt &&
          other.status == this.status &&
          other.payload == this.payload);
}

class ConsultationRowsCompanion extends UpdateCompanion<ConsultationRow> {
  final Value<String> id;
  final Value<String> customerId;
  final Value<String> serviceType;
  final Value<String> createdAt;
  final Value<String?> dueAt;
  final Value<String?> status;
  final Value<String> payload;
  final Value<int> rowid;
  const ConsultationRowsCompanion({
    this.id = const Value.absent(),
    this.customerId = const Value.absent(),
    this.serviceType = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.dueAt = const Value.absent(),
    this.status = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ConsultationRowsCompanion.insert({
    required String id,
    required String customerId,
    required String serviceType,
    required String createdAt,
    this.dueAt = const Value.absent(),
    this.status = const Value.absent(),
    required String payload,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       customerId = Value(customerId),
       serviceType = Value(serviceType),
       createdAt = Value(createdAt),
       payload = Value(payload);
  static Insertable<ConsultationRow> custom({
    Expression<String>? id,
    Expression<String>? customerId,
    Expression<String>? serviceType,
    Expression<String>? createdAt,
    Expression<String>? dueAt,
    Expression<String>? status,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (customerId != null) 'customer_id': customerId,
      if (serviceType != null) 'service_type': serviceType,
      if (createdAt != null) 'created_at': createdAt,
      if (dueAt != null) 'due_at': dueAt,
      if (status != null) 'status': status,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ConsultationRowsCompanion copyWith({
    Value<String>? id,
    Value<String>? customerId,
    Value<String>? serviceType,
    Value<String>? createdAt,
    Value<String?>? dueAt,
    Value<String?>? status,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return ConsultationRowsCompanion(
      id: id ?? this.id,
      customerId: customerId ?? this.customerId,
      serviceType: serviceType ?? this.serviceType,
      createdAt: createdAt ?? this.createdAt,
      dueAt: dueAt ?? this.dueAt,
      status: status ?? this.status,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (serviceType.present) {
      map['service_type'] = Variable<String>(serviceType.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (dueAt.present) {
      map['due_at'] = Variable<String>(dueAt.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ConsultationRowsCompanion(')
          ..write('id: $id, ')
          ..write('customerId: $customerId, ')
          ..write('serviceType: $serviceType, ')
          ..write('createdAt: $createdAt, ')
          ..write('dueAt: $dueAt, ')
          ..write('status: $status, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CardNoteRowsTable extends CardNoteRows
    with TableInfo<$CardNoteRowsTable, CardNoteRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CardNoteRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _cardIdMeta = const VerificationMeta('cardId');
  @override
  late final GeneratedColumn<String> cardId = GeneratedColumn<String>(
    'card_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [cardId, payload];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'card_note_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<CardNoteRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('card_id')) {
      context.handle(
        _cardIdMeta,
        cardId.isAcceptableOrUnknown(data['card_id']!, _cardIdMeta),
      );
    } else if (isInserting) {
      context.missing(_cardIdMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {cardId};
  @override
  CardNoteRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CardNoteRow(
      cardId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}card_id'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $CardNoteRowsTable createAlias(String alias) {
    return $CardNoteRowsTable(attachedDatabase, alias);
  }
}

class CardNoteRow extends DataClass implements Insertable<CardNoteRow> {
  final String cardId;
  final String payload;
  const CardNoteRow({required this.cardId, required this.payload});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['card_id'] = Variable<String>(cardId);
    map['payload'] = Variable<String>(payload);
    return map;
  }

  CardNoteRowsCompanion toCompanion(bool nullToAbsent) {
    return CardNoteRowsCompanion(
      cardId: Value(cardId),
      payload: Value(payload),
    );
  }

  factory CardNoteRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CardNoteRow(
      cardId: serializer.fromJson<String>(json['cardId']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'cardId': serializer.toJson<String>(cardId),
      'payload': serializer.toJson<String>(payload),
    };
  }

  CardNoteRow copyWith({String? cardId, String? payload}) => CardNoteRow(
    cardId: cardId ?? this.cardId,
    payload: payload ?? this.payload,
  );
  CardNoteRow copyWithCompanion(CardNoteRowsCompanion data) {
    return CardNoteRow(
      cardId: data.cardId.present ? data.cardId.value : this.cardId,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CardNoteRow(')
          ..write('cardId: $cardId, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(cardId, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CardNoteRow &&
          other.cardId == this.cardId &&
          other.payload == this.payload);
}

class CardNoteRowsCompanion extends UpdateCompanion<CardNoteRow> {
  final Value<String> cardId;
  final Value<String> payload;
  final Value<int> rowid;
  const CardNoteRowsCompanion({
    this.cardId = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CardNoteRowsCompanion.insert({
    required String cardId,
    required String payload,
    this.rowid = const Value.absent(),
  }) : cardId = Value(cardId),
       payload = Value(payload);
  static Insertable<CardNoteRow> custom({
    Expression<String>? cardId,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (cardId != null) 'card_id': cardId,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CardNoteRowsCompanion copyWith({
    Value<String>? cardId,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return CardNoteRowsCompanion(
      cardId: cardId ?? this.cardId,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (cardId.present) {
      map['card_id'] = Variable<String>(cardId.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CardNoteRowsCompanion(')
          ..write('cardId: $cardId, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $DailyDrawRowsTable extends DailyDrawRows
    with TableInfo<$DailyDrawRowsTable, DailyDrawRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DailyDrawRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _dateMeta = const VerificationMeta('date');
  @override
  late final GeneratedColumn<String> date = GeneratedColumn<String>(
    'date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [date, payload];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'daily_draw_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<DailyDrawRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('date')) {
      context.handle(
        _dateMeta,
        date.isAcceptableOrUnknown(data['date']!, _dateMeta),
      );
    } else if (isInserting) {
      context.missing(_dateMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {date};
  @override
  DailyDrawRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DailyDrawRow(
      date: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}date'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $DailyDrawRowsTable createAlias(String alias) {
    return $DailyDrawRowsTable(attachedDatabase, alias);
  }
}

class DailyDrawRow extends DataClass implements Insertable<DailyDrawRow> {
  final String date;
  final String payload;
  const DailyDrawRow({required this.date, required this.payload});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['date'] = Variable<String>(date);
    map['payload'] = Variable<String>(payload);
    return map;
  }

  DailyDrawRowsCompanion toCompanion(bool nullToAbsent) {
    return DailyDrawRowsCompanion(date: Value(date), payload: Value(payload));
  }

  factory DailyDrawRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DailyDrawRow(
      date: serializer.fromJson<String>(json['date']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'date': serializer.toJson<String>(date),
      'payload': serializer.toJson<String>(payload),
    };
  }

  DailyDrawRow copyWith({String? date, String? payload}) =>
      DailyDrawRow(date: date ?? this.date, payload: payload ?? this.payload);
  DailyDrawRow copyWithCompanion(DailyDrawRowsCompanion data) {
    return DailyDrawRow(
      date: data.date.present ? data.date.value : this.date,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DailyDrawRow(')
          ..write('date: $date, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(date, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DailyDrawRow &&
          other.date == this.date &&
          other.payload == this.payload);
}

class DailyDrawRowsCompanion extends UpdateCompanion<DailyDrawRow> {
  final Value<String> date;
  final Value<String> payload;
  final Value<int> rowid;
  const DailyDrawRowsCompanion({
    this.date = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  DailyDrawRowsCompanion.insert({
    required String date,
    required String payload,
    this.rowid = const Value.absent(),
  }) : date = Value(date),
       payload = Value(payload);
  static Insertable<DailyDrawRow> custom({
    Expression<String>? date,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (date != null) 'date': date,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  DailyDrawRowsCompanion copyWith({
    Value<String>? date,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return DailyDrawRowsCompanion(
      date: date ?? this.date,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (date.present) {
      map['date'] = Variable<String>(date.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DailyDrawRowsCompanion(')
          ..write('date: $date, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CustomSpreadRowsTable extends CustomSpreadRows
    with TableInfo<$CustomSpreadRowsTable, CustomSpreadRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CustomSpreadRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<String> updatedAt = GeneratedColumn<String>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, updatedAt, payload];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'custom_spread_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<CustomSpreadRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CustomSpreadRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CustomSpreadRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}updated_at'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $CustomSpreadRowsTable createAlias(String alias) {
    return $CustomSpreadRowsTable(attachedDatabase, alias);
  }
}

class CustomSpreadRow extends DataClass implements Insertable<CustomSpreadRow> {
  final String id;
  final String updatedAt;
  final String payload;
  const CustomSpreadRow({
    required this.id,
    required this.updatedAt,
    required this.payload,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['updated_at'] = Variable<String>(updatedAt);
    map['payload'] = Variable<String>(payload);
    return map;
  }

  CustomSpreadRowsCompanion toCompanion(bool nullToAbsent) {
    return CustomSpreadRowsCompanion(
      id: Value(id),
      updatedAt: Value(updatedAt),
      payload: Value(payload),
    );
  }

  factory CustomSpreadRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CustomSpreadRow(
      id: serializer.fromJson<String>(json['id']),
      updatedAt: serializer.fromJson<String>(json['updatedAt']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'updatedAt': serializer.toJson<String>(updatedAt),
      'payload': serializer.toJson<String>(payload),
    };
  }

  CustomSpreadRow copyWith({String? id, String? updatedAt, String? payload}) =>
      CustomSpreadRow(
        id: id ?? this.id,
        updatedAt: updatedAt ?? this.updatedAt,
        payload: payload ?? this.payload,
      );
  CustomSpreadRow copyWithCompanion(CustomSpreadRowsCompanion data) {
    return CustomSpreadRow(
      id: data.id.present ? data.id.value : this.id,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CustomSpreadRow(')
          ..write('id: $id, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, updatedAt, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CustomSpreadRow &&
          other.id == this.id &&
          other.updatedAt == this.updatedAt &&
          other.payload == this.payload);
}

class CustomSpreadRowsCompanion extends UpdateCompanion<CustomSpreadRow> {
  final Value<String> id;
  final Value<String> updatedAt;
  final Value<String> payload;
  final Value<int> rowid;
  const CustomSpreadRowsCompanion({
    this.id = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CustomSpreadRowsCompanion.insert({
    required String id,
    required String updatedAt,
    required String payload,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       updatedAt = Value(updatedAt),
       payload = Value(payload);
  static Insertable<CustomSpreadRow> custom({
    Expression<String>? id,
    Expression<String>? updatedAt,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CustomSpreadRowsCompanion copyWith({
    Value<String>? id,
    Value<String>? updatedAt,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return CustomSpreadRowsCompanion(
      id: id ?? this.id,
      updatedAt: updatedAt ?? this.updatedAt,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<String>(updatedAt.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CustomSpreadRowsCompanion(')
          ..write('id: $id, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SrsRowsTable extends SrsRows with TableInfo<$SrsRowsTable, SrsRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SrsRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _cardIdMeta = const VerificationMeta('cardId');
  @override
  late final GeneratedColumn<String> cardId = GeneratedColumn<String>(
    'card_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dueAtMeta = const VerificationMeta('dueAt');
  @override
  late final GeneratedColumn<String> dueAt = GeneratedColumn<String>(
    'due_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [cardId, dueAt, payload];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'srs_rows';
  @override
  VerificationContext validateIntegrity(
    Insertable<SrsRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('card_id')) {
      context.handle(
        _cardIdMeta,
        cardId.isAcceptableOrUnknown(data['card_id']!, _cardIdMeta),
      );
    } else if (isInserting) {
      context.missing(_cardIdMeta);
    }
    if (data.containsKey('due_at')) {
      context.handle(
        _dueAtMeta,
        dueAt.isAcceptableOrUnknown(data['due_at']!, _dueAtMeta),
      );
    } else if (isInserting) {
      context.missing(_dueAtMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {cardId};
  @override
  SrsRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SrsRow(
      cardId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}card_id'],
      )!,
      dueAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}due_at'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
    );
  }

  @override
  $SrsRowsTable createAlias(String alias) {
    return $SrsRowsTable(attachedDatabase, alias);
  }
}

class SrsRow extends DataClass implements Insertable<SrsRow> {
  final String cardId;

  /// ISO 문자열. 사전순 = 시간순 성질에 조회가 의존한다.
  /// **COLLATE NOCASE를 절대 걸지 말 것** — 지금은 숫자뿐이라 통과하지만 함정이다.
  final String dueAt;
  final String payload;
  const SrsRow({
    required this.cardId,
    required this.dueAt,
    required this.payload,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['card_id'] = Variable<String>(cardId);
    map['due_at'] = Variable<String>(dueAt);
    map['payload'] = Variable<String>(payload);
    return map;
  }

  SrsRowsCompanion toCompanion(bool nullToAbsent) {
    return SrsRowsCompanion(
      cardId: Value(cardId),
      dueAt: Value(dueAt),
      payload: Value(payload),
    );
  }

  factory SrsRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SrsRow(
      cardId: serializer.fromJson<String>(json['cardId']),
      dueAt: serializer.fromJson<String>(json['dueAt']),
      payload: serializer.fromJson<String>(json['payload']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'cardId': serializer.toJson<String>(cardId),
      'dueAt': serializer.toJson<String>(dueAt),
      'payload': serializer.toJson<String>(payload),
    };
  }

  SrsRow copyWith({String? cardId, String? dueAt, String? payload}) => SrsRow(
    cardId: cardId ?? this.cardId,
    dueAt: dueAt ?? this.dueAt,
    payload: payload ?? this.payload,
  );
  SrsRow copyWithCompanion(SrsRowsCompanion data) {
    return SrsRow(
      cardId: data.cardId.present ? data.cardId.value : this.cardId,
      dueAt: data.dueAt.present ? data.dueAt.value : this.dueAt,
      payload: data.payload.present ? data.payload.value : this.payload,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SrsRow(')
          ..write('cardId: $cardId, ')
          ..write('dueAt: $dueAt, ')
          ..write('payload: $payload')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(cardId, dueAt, payload);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SrsRow &&
          other.cardId == this.cardId &&
          other.dueAt == this.dueAt &&
          other.payload == this.payload);
}

class SrsRowsCompanion extends UpdateCompanion<SrsRow> {
  final Value<String> cardId;
  final Value<String> dueAt;
  final Value<String> payload;
  final Value<int> rowid;
  const SrsRowsCompanion({
    this.cardId = const Value.absent(),
    this.dueAt = const Value.absent(),
    this.payload = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SrsRowsCompanion.insert({
    required String cardId,
    required String dueAt,
    required String payload,
    this.rowid = const Value.absent(),
  }) : cardId = Value(cardId),
       dueAt = Value(dueAt),
       payload = Value(payload);
  static Insertable<SrsRow> custom({
    Expression<String>? cardId,
    Expression<String>? dueAt,
    Expression<String>? payload,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (cardId != null) 'card_id': cardId,
      if (dueAt != null) 'due_at': dueAt,
      if (payload != null) 'payload': payload,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SrsRowsCompanion copyWith({
    Value<String>? cardId,
    Value<String>? dueAt,
    Value<String>? payload,
    Value<int>? rowid,
  }) {
    return SrsRowsCompanion(
      cardId: cardId ?? this.cardId,
      dueAt: dueAt ?? this.dueAt,
      payload: payload ?? this.payload,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (cardId.present) {
      map['card_id'] = Variable<String>(cardId.value);
    }
    if (dueAt.present) {
      map['due_at'] = Variable<String>(dueAt.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SrsRowsCompanion(')
          ..write('cardId: $cardId, ')
          ..write('dueAt: $dueAt, ')
          ..write('payload: $payload, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $HistoryRowsTable historyRows = $HistoryRowsTable(this);
  late final $CustomerRowsTable customerRows = $CustomerRowsTable(this);
  late final $ConsultationRowsTable consultationRows = $ConsultationRowsTable(
    this,
  );
  late final $CardNoteRowsTable cardNoteRows = $CardNoteRowsTable(this);
  late final $DailyDrawRowsTable dailyDrawRows = $DailyDrawRowsTable(this);
  late final $CustomSpreadRowsTable customSpreadRows = $CustomSpreadRowsTable(
    this,
  );
  late final $SrsRowsTable srsRows = $SrsRowsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    historyRows,
    customerRows,
    consultationRows,
    cardNoteRows,
    dailyDrawRows,
    customSpreadRows,
    srsRows,
  ];
}

typedef $$HistoryRowsTableCreateCompanionBuilder =
    HistoryRowsCompanion Function({
      required String id,
      required String kind,
      required String createdAt,
      Value<String?> customerId,
      Value<String?> outcome,
      required String payload,
      Value<int> rowid,
    });
typedef $$HistoryRowsTableUpdateCompanionBuilder =
    HistoryRowsCompanion Function({
      Value<String> id,
      Value<String> kind,
      Value<String> createdAt,
      Value<String?> customerId,
      Value<String?> outcome,
      Value<String> payload,
      Value<int> rowid,
    });

class $$HistoryRowsTableFilterComposer
    extends Composer<_$AppDatabase, $HistoryRowsTable> {
  $$HistoryRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get outcome => $composableBuilder(
    column: $table.outcome,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$HistoryRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $HistoryRowsTable> {
  $$HistoryRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get outcome => $composableBuilder(
    column: $table.outcome,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$HistoryRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $HistoryRowsTable> {
  $$HistoryRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => column);

  GeneratedColumn<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get outcome =>
      $composableBuilder(column: $table.outcome, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$HistoryRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HistoryRowsTable,
          HistoryRow,
          $$HistoryRowsTableFilterComposer,
          $$HistoryRowsTableOrderingComposer,
          $$HistoryRowsTableAnnotationComposer,
          $$HistoryRowsTableCreateCompanionBuilder,
          $$HistoryRowsTableUpdateCompanionBuilder,
          (
            HistoryRow,
            BaseReferences<_$AppDatabase, $HistoryRowsTable, HistoryRow>,
          ),
          HistoryRow,
          PrefetchHooks Function()
        > {
  $$HistoryRowsTableTableManager(_$AppDatabase db, $HistoryRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HistoryRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HistoryRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HistoryRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> customerId = const Value.absent(),
                Value<String?> outcome = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HistoryRowsCompanion(
                id: id,
                kind: kind,
                createdAt: createdAt,
                customerId: customerId,
                outcome: outcome,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String kind,
                required String createdAt,
                Value<String?> customerId = const Value.absent(),
                Value<String?> outcome = const Value.absent(),
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => HistoryRowsCompanion.insert(
                id: id,
                kind: kind,
                createdAt: createdAt,
                customerId: customerId,
                outcome: outcome,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$HistoryRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HistoryRowsTable,
      HistoryRow,
      $$HistoryRowsTableFilterComposer,
      $$HistoryRowsTableOrderingComposer,
      $$HistoryRowsTableAnnotationComposer,
      $$HistoryRowsTableCreateCompanionBuilder,
      $$HistoryRowsTableUpdateCompanionBuilder,
      (
        HistoryRow,
        BaseReferences<_$AppDatabase, $HistoryRowsTable, HistoryRow>,
      ),
      HistoryRow,
      PrefetchHooks Function()
    >;
typedef $$CustomerRowsTableCreateCompanionBuilder =
    CustomerRowsCompanion Function({
      required String id,
      required String name,
      required String updatedAt,
      required String payload,
      Value<int> rowid,
    });
typedef $$CustomerRowsTableUpdateCompanionBuilder =
    CustomerRowsCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String> updatedAt,
      Value<String> payload,
      Value<int> rowid,
    });

class $$CustomerRowsTableFilterComposer
    extends Composer<_$AppDatabase, $CustomerRowsTable> {
  $$CustomerRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CustomerRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $CustomerRowsTable> {
  $$CustomerRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CustomerRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CustomerRowsTable> {
  $$CustomerRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$CustomerRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CustomerRowsTable,
          CustomerRow,
          $$CustomerRowsTableFilterComposer,
          $$CustomerRowsTableOrderingComposer,
          $$CustomerRowsTableAnnotationComposer,
          $$CustomerRowsTableCreateCompanionBuilder,
          $$CustomerRowsTableUpdateCompanionBuilder,
          (
            CustomerRow,
            BaseReferences<_$AppDatabase, $CustomerRowsTable, CustomerRow>,
          ),
          CustomerRow,
          PrefetchHooks Function()
        > {
  $$CustomerRowsTableTableManager(_$AppDatabase db, $CustomerRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CustomerRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CustomerRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CustomerRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String> updatedAt = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CustomerRowsCompanion(
                id: id,
                name: name,
                updatedAt: updatedAt,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                required String updatedAt,
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => CustomerRowsCompanion.insert(
                id: id,
                name: name,
                updatedAt: updatedAt,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CustomerRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CustomerRowsTable,
      CustomerRow,
      $$CustomerRowsTableFilterComposer,
      $$CustomerRowsTableOrderingComposer,
      $$CustomerRowsTableAnnotationComposer,
      $$CustomerRowsTableCreateCompanionBuilder,
      $$CustomerRowsTableUpdateCompanionBuilder,
      (
        CustomerRow,
        BaseReferences<_$AppDatabase, $CustomerRowsTable, CustomerRow>,
      ),
      CustomerRow,
      PrefetchHooks Function()
    >;
typedef $$ConsultationRowsTableCreateCompanionBuilder =
    ConsultationRowsCompanion Function({
      required String id,
      required String customerId,
      required String serviceType,
      required String createdAt,
      Value<String?> dueAt,
      Value<String?> status,
      required String payload,
      Value<int> rowid,
    });
typedef $$ConsultationRowsTableUpdateCompanionBuilder =
    ConsultationRowsCompanion Function({
      Value<String> id,
      Value<String> customerId,
      Value<String> serviceType,
      Value<String> createdAt,
      Value<String?> dueAt,
      Value<String?> status,
      Value<String> payload,
      Value<int> rowid,
    });

class $$ConsultationRowsTableFilterComposer
    extends Composer<_$AppDatabase, $ConsultationRowsTable> {
  $$ConsultationRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serviceType => $composableBuilder(
    column: $table.serviceType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dueAt => $composableBuilder(
    column: $table.dueAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ConsultationRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $ConsultationRowsTable> {
  $$ConsultationRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serviceType => $composableBuilder(
    column: $table.serviceType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dueAt => $composableBuilder(
    column: $table.dueAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ConsultationRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ConsultationRowsTable> {
  $$ConsultationRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get customerId => $composableBuilder(
    column: $table.customerId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get serviceType => $composableBuilder(
    column: $table.serviceType,
    builder: (column) => column,
  );

  GeneratedColumn<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get dueAt =>
      $composableBuilder(column: $table.dueAt, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$ConsultationRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ConsultationRowsTable,
          ConsultationRow,
          $$ConsultationRowsTableFilterComposer,
          $$ConsultationRowsTableOrderingComposer,
          $$ConsultationRowsTableAnnotationComposer,
          $$ConsultationRowsTableCreateCompanionBuilder,
          $$ConsultationRowsTableUpdateCompanionBuilder,
          (
            ConsultationRow,
            BaseReferences<
              _$AppDatabase,
              $ConsultationRowsTable,
              ConsultationRow
            >,
          ),
          ConsultationRow,
          PrefetchHooks Function()
        > {
  $$ConsultationRowsTableTableManager(
    _$AppDatabase db,
    $ConsultationRowsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ConsultationRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ConsultationRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ConsultationRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> customerId = const Value.absent(),
                Value<String> serviceType = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> dueAt = const Value.absent(),
                Value<String?> status = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ConsultationRowsCompanion(
                id: id,
                customerId: customerId,
                serviceType: serviceType,
                createdAt: createdAt,
                dueAt: dueAt,
                status: status,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String customerId,
                required String serviceType,
                required String createdAt,
                Value<String?> dueAt = const Value.absent(),
                Value<String?> status = const Value.absent(),
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => ConsultationRowsCompanion.insert(
                id: id,
                customerId: customerId,
                serviceType: serviceType,
                createdAt: createdAt,
                dueAt: dueAt,
                status: status,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ConsultationRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ConsultationRowsTable,
      ConsultationRow,
      $$ConsultationRowsTableFilterComposer,
      $$ConsultationRowsTableOrderingComposer,
      $$ConsultationRowsTableAnnotationComposer,
      $$ConsultationRowsTableCreateCompanionBuilder,
      $$ConsultationRowsTableUpdateCompanionBuilder,
      (
        ConsultationRow,
        BaseReferences<_$AppDatabase, $ConsultationRowsTable, ConsultationRow>,
      ),
      ConsultationRow,
      PrefetchHooks Function()
    >;
typedef $$CardNoteRowsTableCreateCompanionBuilder =
    CardNoteRowsCompanion Function({
      required String cardId,
      required String payload,
      Value<int> rowid,
    });
typedef $$CardNoteRowsTableUpdateCompanionBuilder =
    CardNoteRowsCompanion Function({
      Value<String> cardId,
      Value<String> payload,
      Value<int> rowid,
    });

class $$CardNoteRowsTableFilterComposer
    extends Composer<_$AppDatabase, $CardNoteRowsTable> {
  $$CardNoteRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get cardId => $composableBuilder(
    column: $table.cardId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CardNoteRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $CardNoteRowsTable> {
  $$CardNoteRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get cardId => $composableBuilder(
    column: $table.cardId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CardNoteRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CardNoteRowsTable> {
  $$CardNoteRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get cardId =>
      $composableBuilder(column: $table.cardId, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$CardNoteRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CardNoteRowsTable,
          CardNoteRow,
          $$CardNoteRowsTableFilterComposer,
          $$CardNoteRowsTableOrderingComposer,
          $$CardNoteRowsTableAnnotationComposer,
          $$CardNoteRowsTableCreateCompanionBuilder,
          $$CardNoteRowsTableUpdateCompanionBuilder,
          (
            CardNoteRow,
            BaseReferences<_$AppDatabase, $CardNoteRowsTable, CardNoteRow>,
          ),
          CardNoteRow,
          PrefetchHooks Function()
        > {
  $$CardNoteRowsTableTableManager(_$AppDatabase db, $CardNoteRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CardNoteRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CardNoteRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CardNoteRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> cardId = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CardNoteRowsCompanion(
                cardId: cardId,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String cardId,
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => CardNoteRowsCompanion.insert(
                cardId: cardId,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CardNoteRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CardNoteRowsTable,
      CardNoteRow,
      $$CardNoteRowsTableFilterComposer,
      $$CardNoteRowsTableOrderingComposer,
      $$CardNoteRowsTableAnnotationComposer,
      $$CardNoteRowsTableCreateCompanionBuilder,
      $$CardNoteRowsTableUpdateCompanionBuilder,
      (
        CardNoteRow,
        BaseReferences<_$AppDatabase, $CardNoteRowsTable, CardNoteRow>,
      ),
      CardNoteRow,
      PrefetchHooks Function()
    >;
typedef $$DailyDrawRowsTableCreateCompanionBuilder =
    DailyDrawRowsCompanion Function({
      required String date,
      required String payload,
      Value<int> rowid,
    });
typedef $$DailyDrawRowsTableUpdateCompanionBuilder =
    DailyDrawRowsCompanion Function({
      Value<String> date,
      Value<String> payload,
      Value<int> rowid,
    });

class $$DailyDrawRowsTableFilterComposer
    extends Composer<_$AppDatabase, $DailyDrawRowsTable> {
  $$DailyDrawRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$DailyDrawRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $DailyDrawRowsTable> {
  $$DailyDrawRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get date => $composableBuilder(
    column: $table.date,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$DailyDrawRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $DailyDrawRowsTable> {
  $$DailyDrawRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get date =>
      $composableBuilder(column: $table.date, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$DailyDrawRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $DailyDrawRowsTable,
          DailyDrawRow,
          $$DailyDrawRowsTableFilterComposer,
          $$DailyDrawRowsTableOrderingComposer,
          $$DailyDrawRowsTableAnnotationComposer,
          $$DailyDrawRowsTableCreateCompanionBuilder,
          $$DailyDrawRowsTableUpdateCompanionBuilder,
          (
            DailyDrawRow,
            BaseReferences<_$AppDatabase, $DailyDrawRowsTable, DailyDrawRow>,
          ),
          DailyDrawRow,
          PrefetchHooks Function()
        > {
  $$DailyDrawRowsTableTableManager(_$AppDatabase db, $DailyDrawRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$DailyDrawRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$DailyDrawRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$DailyDrawRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> date = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DailyDrawRowsCompanion(
                date: date,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String date,
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => DailyDrawRowsCompanion.insert(
                date: date,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$DailyDrawRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $DailyDrawRowsTable,
      DailyDrawRow,
      $$DailyDrawRowsTableFilterComposer,
      $$DailyDrawRowsTableOrderingComposer,
      $$DailyDrawRowsTableAnnotationComposer,
      $$DailyDrawRowsTableCreateCompanionBuilder,
      $$DailyDrawRowsTableUpdateCompanionBuilder,
      (
        DailyDrawRow,
        BaseReferences<_$AppDatabase, $DailyDrawRowsTable, DailyDrawRow>,
      ),
      DailyDrawRow,
      PrefetchHooks Function()
    >;
typedef $$CustomSpreadRowsTableCreateCompanionBuilder =
    CustomSpreadRowsCompanion Function({
      required String id,
      required String updatedAt,
      required String payload,
      Value<int> rowid,
    });
typedef $$CustomSpreadRowsTableUpdateCompanionBuilder =
    CustomSpreadRowsCompanion Function({
      Value<String> id,
      Value<String> updatedAt,
      Value<String> payload,
      Value<int> rowid,
    });

class $$CustomSpreadRowsTableFilterComposer
    extends Composer<_$AppDatabase, $CustomSpreadRowsTable> {
  $$CustomSpreadRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CustomSpreadRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $CustomSpreadRowsTable> {
  $$CustomSpreadRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CustomSpreadRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $CustomSpreadRowsTable> {
  $$CustomSpreadRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$CustomSpreadRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $CustomSpreadRowsTable,
          CustomSpreadRow,
          $$CustomSpreadRowsTableFilterComposer,
          $$CustomSpreadRowsTableOrderingComposer,
          $$CustomSpreadRowsTableAnnotationComposer,
          $$CustomSpreadRowsTableCreateCompanionBuilder,
          $$CustomSpreadRowsTableUpdateCompanionBuilder,
          (
            CustomSpreadRow,
            BaseReferences<
              _$AppDatabase,
              $CustomSpreadRowsTable,
              CustomSpreadRow
            >,
          ),
          CustomSpreadRow,
          PrefetchHooks Function()
        > {
  $$CustomSpreadRowsTableTableManager(
    _$AppDatabase db,
    $CustomSpreadRowsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CustomSpreadRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CustomSpreadRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CustomSpreadRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> updatedAt = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CustomSpreadRowsCompanion(
                id: id,
                updatedAt: updatedAt,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String updatedAt,
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => CustomSpreadRowsCompanion.insert(
                id: id,
                updatedAt: updatedAt,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CustomSpreadRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $CustomSpreadRowsTable,
      CustomSpreadRow,
      $$CustomSpreadRowsTableFilterComposer,
      $$CustomSpreadRowsTableOrderingComposer,
      $$CustomSpreadRowsTableAnnotationComposer,
      $$CustomSpreadRowsTableCreateCompanionBuilder,
      $$CustomSpreadRowsTableUpdateCompanionBuilder,
      (
        CustomSpreadRow,
        BaseReferences<_$AppDatabase, $CustomSpreadRowsTable, CustomSpreadRow>,
      ),
      CustomSpreadRow,
      PrefetchHooks Function()
    >;
typedef $$SrsRowsTableCreateCompanionBuilder =
    SrsRowsCompanion Function({
      required String cardId,
      required String dueAt,
      required String payload,
      Value<int> rowid,
    });
typedef $$SrsRowsTableUpdateCompanionBuilder =
    SrsRowsCompanion Function({
      Value<String> cardId,
      Value<String> dueAt,
      Value<String> payload,
      Value<int> rowid,
    });

class $$SrsRowsTableFilterComposer
    extends Composer<_$AppDatabase, $SrsRowsTable> {
  $$SrsRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get cardId => $composableBuilder(
    column: $table.cardId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dueAt => $composableBuilder(
    column: $table.dueAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SrsRowsTableOrderingComposer
    extends Composer<_$AppDatabase, $SrsRowsTable> {
  $$SrsRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get cardId => $composableBuilder(
    column: $table.cardId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dueAt => $composableBuilder(
    column: $table.dueAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SrsRowsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SrsRowsTable> {
  $$SrsRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get cardId =>
      $composableBuilder(column: $table.cardId, builder: (column) => column);

  GeneratedColumn<String> get dueAt =>
      $composableBuilder(column: $table.dueAt, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);
}

class $$SrsRowsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SrsRowsTable,
          SrsRow,
          $$SrsRowsTableFilterComposer,
          $$SrsRowsTableOrderingComposer,
          $$SrsRowsTableAnnotationComposer,
          $$SrsRowsTableCreateCompanionBuilder,
          $$SrsRowsTableUpdateCompanionBuilder,
          (SrsRow, BaseReferences<_$AppDatabase, $SrsRowsTable, SrsRow>),
          SrsRow,
          PrefetchHooks Function()
        > {
  $$SrsRowsTableTableManager(_$AppDatabase db, $SrsRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SrsRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SrsRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SrsRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> cardId = const Value.absent(),
                Value<String> dueAt = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SrsRowsCompanion(
                cardId: cardId,
                dueAt: dueAt,
                payload: payload,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String cardId,
                required String dueAt,
                required String payload,
                Value<int> rowid = const Value.absent(),
              }) => SrsRowsCompanion.insert(
                cardId: cardId,
                dueAt: dueAt,
                payload: payload,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SrsRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SrsRowsTable,
      SrsRow,
      $$SrsRowsTableFilterComposer,
      $$SrsRowsTableOrderingComposer,
      $$SrsRowsTableAnnotationComposer,
      $$SrsRowsTableCreateCompanionBuilder,
      $$SrsRowsTableUpdateCompanionBuilder,
      (SrsRow, BaseReferences<_$AppDatabase, $SrsRowsTable, SrsRow>),
      SrsRow,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$HistoryRowsTableTableManager get historyRows =>
      $$HistoryRowsTableTableManager(_db, _db.historyRows);
  $$CustomerRowsTableTableManager get customerRows =>
      $$CustomerRowsTableTableManager(_db, _db.customerRows);
  $$ConsultationRowsTableTableManager get consultationRows =>
      $$ConsultationRowsTableTableManager(_db, _db.consultationRows);
  $$CardNoteRowsTableTableManager get cardNoteRows =>
      $$CardNoteRowsTableTableManager(_db, _db.cardNoteRows);
  $$DailyDrawRowsTableTableManager get dailyDrawRows =>
      $$DailyDrawRowsTableTableManager(_db, _db.dailyDrawRows);
  $$CustomSpreadRowsTableTableManager get customSpreadRows =>
      $$CustomSpreadRowsTableTableManager(_db, _db.customSpreadRows);
  $$SrsRowsTableTableManager get srsRows =>
      $$SrsRowsTableTableManager(_db, _db.srsRows);
}
