// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $BooksTable extends Books with TableInfo<$BooksTable, Book> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BooksTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _isbnMeta = const VerificationMeta('isbn');
  @override
  late final GeneratedColumn<String> isbn = GeneratedColumn<String>(
    'isbn',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _authorMeta = const VerificationMeta('author');
  @override
  late final GeneratedColumn<String> author = GeneratedColumn<String>(
    'author',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author2Meta = const VerificationMeta(
    'author2',
  );
  @override
  late final GeneratedColumn<String> author2 = GeneratedColumn<String>(
    'author2',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author3Meta = const VerificationMeta(
    'author3',
  );
  @override
  late final GeneratedColumn<String> author3 = GeneratedColumn<String>(
    'author3',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author4Meta = const VerificationMeta(
    'author4',
  );
  @override
  late final GeneratedColumn<String> author4 = GeneratedColumn<String>(
    'author4',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author5Meta = const VerificationMeta(
    'author5',
  );
  @override
  late final GeneratedColumn<String> author5 = GeneratedColumn<String>(
    'author5',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _publisherMeta = const VerificationMeta(
    'publisher',
  );
  @override
  late final GeneratedColumn<String> publisher = GeneratedColumn<String>(
    'publisher',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _yearMeta = const VerificationMeta('year');
  @override
  late final GeneratedColumn<String> year = GeneratedColumn<String>(
    'year',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _quantityMeta = const VerificationMeta(
    'quantity',
  );
  @override
  late final GeneratedColumn<int> quantity = GeneratedColumn<int>(
    'quantity',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _conditionMeta = const VerificationMeta(
    'condition',
  );
  @override
  late final GeneratedColumn<String> condition = GeneratedColumn<String>(
    'condition',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _shelfLocationMeta = const VerificationMeta(
    'shelfLocation',
  );
  @override
  late final GeneratedColumn<String> shelfLocation = GeneratedColumn<String>(
    'shelf_location',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
    'notes',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _schoolIdMeta = const VerificationMeta(
    'schoolId',
  );
  @override
  late final GeneratedColumn<String> schoolId = GeneratedColumn<String>(
    'school_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _clerkIdMeta = const VerificationMeta(
    'clerkId',
  );
  @override
  late final GeneratedColumn<String> clerkId = GeneratedColumn<String>(
    'clerk_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _flaggedAsDuplicateMeta =
      const VerificationMeta('flaggedAsDuplicate');
  @override
  late final GeneratedColumn<bool> flaggedAsDuplicate = GeneratedColumn<bool>(
    'flagged_as_duplicate',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("flagged_as_duplicate" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _syncStateMeta = const VerificationMeta(
    'syncState',
  );
  @override
  late final GeneratedColumn<String> syncState = GeneratedColumn<String>(
    'sync_state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    isbn,
    title,
    author,
    author2,
    author3,
    author4,
    author5,
    publisher,
    year,
    quantity,
    condition,
    category,
    shelfLocation,
    notes,
    schoolId,
    clerkId,
    flaggedAsDuplicate,
    syncState,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'books';
  @override
  VerificationContext validateIntegrity(
    Insertable<Book> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('isbn')) {
      context.handle(
        _isbnMeta,
        isbn.isAcceptableOrUnknown(data['isbn']!, _isbnMeta),
      );
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    }
    if (data.containsKey('author')) {
      context.handle(
        _authorMeta,
        author.isAcceptableOrUnknown(data['author']!, _authorMeta),
      );
    }
    if (data.containsKey('author2')) {
      context.handle(
        _author2Meta,
        author2.isAcceptableOrUnknown(data['author2']!, _author2Meta),
      );
    }
    if (data.containsKey('author3')) {
      context.handle(
        _author3Meta,
        author3.isAcceptableOrUnknown(data['author3']!, _author3Meta),
      );
    }
    if (data.containsKey('author4')) {
      context.handle(
        _author4Meta,
        author4.isAcceptableOrUnknown(data['author4']!, _author4Meta),
      );
    }
    if (data.containsKey('author5')) {
      context.handle(
        _author5Meta,
        author5.isAcceptableOrUnknown(data['author5']!, _author5Meta),
      );
    }
    if (data.containsKey('publisher')) {
      context.handle(
        _publisherMeta,
        publisher.isAcceptableOrUnknown(data['publisher']!, _publisherMeta),
      );
    }
    if (data.containsKey('year')) {
      context.handle(
        _yearMeta,
        year.isAcceptableOrUnknown(data['year']!, _yearMeta),
      );
    }
    if (data.containsKey('quantity')) {
      context.handle(
        _quantityMeta,
        quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta),
      );
    }
    if (data.containsKey('condition')) {
      context.handle(
        _conditionMeta,
        condition.isAcceptableOrUnknown(data['condition']!, _conditionMeta),
      );
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    if (data.containsKey('shelf_location')) {
      context.handle(
        _shelfLocationMeta,
        shelfLocation.isAcceptableOrUnknown(
          data['shelf_location']!,
          _shelfLocationMeta,
        ),
      );
    }
    if (data.containsKey('notes')) {
      context.handle(
        _notesMeta,
        notes.isAcceptableOrUnknown(data['notes']!, _notesMeta),
      );
    }
    if (data.containsKey('school_id')) {
      context.handle(
        _schoolIdMeta,
        schoolId.isAcceptableOrUnknown(data['school_id']!, _schoolIdMeta),
      );
    } else if (isInserting) {
      context.missing(_schoolIdMeta);
    }
    if (data.containsKey('clerk_id')) {
      context.handle(
        _clerkIdMeta,
        clerkId.isAcceptableOrUnknown(data['clerk_id']!, _clerkIdMeta),
      );
    } else if (isInserting) {
      context.missing(_clerkIdMeta);
    }
    if (data.containsKey('flagged_as_duplicate')) {
      context.handle(
        _flaggedAsDuplicateMeta,
        flaggedAsDuplicate.isAcceptableOrUnknown(
          data['flagged_as_duplicate']!,
          _flaggedAsDuplicateMeta,
        ),
      );
    }
    if (data.containsKey('sync_state')) {
      context.handle(
        _syncStateMeta,
        syncState.isAcceptableOrUnknown(data['sync_state']!, _syncStateMeta),
      );
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Book map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Book(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      isbn: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}isbn'],
      ),
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      ),
      author: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author'],
      ),
      author2: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author2'],
      ),
      author3: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author3'],
      ),
      author4: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author4'],
      ),
      author5: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author5'],
      ),
      publisher: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}publisher'],
      ),
      year: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}year'],
      ),
      quantity: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}quantity'],
      )!,
      condition: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}condition'],
      ),
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      ),
      shelfLocation: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}shelf_location'],
      ),
      notes: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}notes'],
      ),
      schoolId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}school_id'],
      )!,
      clerkId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}clerk_id'],
      )!,
      flaggedAsDuplicate: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}flagged_as_duplicate'],
      )!,
      syncState: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sync_state'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $BooksTable createAlias(String alias) {
    return $BooksTable(attachedDatabase, alias);
  }
}

class Book extends DataClass implements Insertable<Book> {
  final String id;
  final String? isbn;
  final String? title;
  final String? author;
  final String? author2;
  final String? author3;
  final String? author4;
  final String? author5;
  final String? publisher;
  final String? year;
  final int quantity;
  final String? condition;
  final String? category;
  final String? shelfLocation;
  final String? notes;
  final String schoolId;
  final String clerkId;
  final bool flaggedAsDuplicate;
  final String syncState;
  final DateTime updatedAt;
  const Book({
    required this.id,
    this.isbn,
    this.title,
    this.author,
    this.author2,
    this.author3,
    this.author4,
    this.author5,
    this.publisher,
    this.year,
    required this.quantity,
    this.condition,
    this.category,
    this.shelfLocation,
    this.notes,
    required this.schoolId,
    required this.clerkId,
    required this.flaggedAsDuplicate,
    required this.syncState,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || isbn != null) {
      map['isbn'] = Variable<String>(isbn);
    }
    if (!nullToAbsent || title != null) {
      map['title'] = Variable<String>(title);
    }
    if (!nullToAbsent || author != null) {
      map['author'] = Variable<String>(author);
    }
    if (!nullToAbsent || author2 != null) {
      map['author2'] = Variable<String>(author2);
    }
    if (!nullToAbsent || author3 != null) {
      map['author3'] = Variable<String>(author3);
    }
    if (!nullToAbsent || author4 != null) {
      map['author4'] = Variable<String>(author4);
    }
    if (!nullToAbsent || author5 != null) {
      map['author5'] = Variable<String>(author5);
    }
    if (!nullToAbsent || publisher != null) {
      map['publisher'] = Variable<String>(publisher);
    }
    if (!nullToAbsent || year != null) {
      map['year'] = Variable<String>(year);
    }
    map['quantity'] = Variable<int>(quantity);
    if (!nullToAbsent || condition != null) {
      map['condition'] = Variable<String>(condition);
    }
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    if (!nullToAbsent || shelfLocation != null) {
      map['shelf_location'] = Variable<String>(shelfLocation);
    }
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    map['school_id'] = Variable<String>(schoolId);
    map['clerk_id'] = Variable<String>(clerkId);
    map['flagged_as_duplicate'] = Variable<bool>(flaggedAsDuplicate);
    map['sync_state'] = Variable<String>(syncState);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  BooksCompanion toCompanion(bool nullToAbsent) {
    return BooksCompanion(
      id: Value(id),
      isbn: isbn == null && nullToAbsent ? const Value.absent() : Value(isbn),
      title: title == null && nullToAbsent
          ? const Value.absent()
          : Value(title),
      author: author == null && nullToAbsent
          ? const Value.absent()
          : Value(author),
      author2: author2 == null && nullToAbsent
          ? const Value.absent()
          : Value(author2),
      author3: author3 == null && nullToAbsent
          ? const Value.absent()
          : Value(author3),
      author4: author4 == null && nullToAbsent
          ? const Value.absent()
          : Value(author4),
      author5: author5 == null && nullToAbsent
          ? const Value.absent()
          : Value(author5),
      publisher: publisher == null && nullToAbsent
          ? const Value.absent()
          : Value(publisher),
      year: year == null && nullToAbsent ? const Value.absent() : Value(year),
      quantity: Value(quantity),
      condition: condition == null && nullToAbsent
          ? const Value.absent()
          : Value(condition),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      shelfLocation: shelfLocation == null && nullToAbsent
          ? const Value.absent()
          : Value(shelfLocation),
      notes: notes == null && nullToAbsent
          ? const Value.absent()
          : Value(notes),
      schoolId: Value(schoolId),
      clerkId: Value(clerkId),
      flaggedAsDuplicate: Value(flaggedAsDuplicate),
      syncState: Value(syncState),
      updatedAt: Value(updatedAt),
    );
  }

  factory Book.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Book(
      id: serializer.fromJson<String>(json['id']),
      isbn: serializer.fromJson<String?>(json['isbn']),
      title: serializer.fromJson<String?>(json['title']),
      author: serializer.fromJson<String?>(json['author']),
      author2: serializer.fromJson<String?>(json['author2']),
      author3: serializer.fromJson<String?>(json['author3']),
      author4: serializer.fromJson<String?>(json['author4']),
      author5: serializer.fromJson<String?>(json['author5']),
      publisher: serializer.fromJson<String?>(json['publisher']),
      year: serializer.fromJson<String?>(json['year']),
      quantity: serializer.fromJson<int>(json['quantity']),
      condition: serializer.fromJson<String?>(json['condition']),
      category: serializer.fromJson<String?>(json['category']),
      shelfLocation: serializer.fromJson<String?>(json['shelfLocation']),
      notes: serializer.fromJson<String?>(json['notes']),
      schoolId: serializer.fromJson<String>(json['schoolId']),
      clerkId: serializer.fromJson<String>(json['clerkId']),
      flaggedAsDuplicate: serializer.fromJson<bool>(json['flaggedAsDuplicate']),
      syncState: serializer.fromJson<String>(json['syncState']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'isbn': serializer.toJson<String?>(isbn),
      'title': serializer.toJson<String?>(title),
      'author': serializer.toJson<String?>(author),
      'author2': serializer.toJson<String?>(author2),
      'author3': serializer.toJson<String?>(author3),
      'author4': serializer.toJson<String?>(author4),
      'author5': serializer.toJson<String?>(author5),
      'publisher': serializer.toJson<String?>(publisher),
      'year': serializer.toJson<String?>(year),
      'quantity': serializer.toJson<int>(quantity),
      'condition': serializer.toJson<String?>(condition),
      'category': serializer.toJson<String?>(category),
      'shelfLocation': serializer.toJson<String?>(shelfLocation),
      'notes': serializer.toJson<String?>(notes),
      'schoolId': serializer.toJson<String>(schoolId),
      'clerkId': serializer.toJson<String>(clerkId),
      'flaggedAsDuplicate': serializer.toJson<bool>(flaggedAsDuplicate),
      'syncState': serializer.toJson<String>(syncState),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Book copyWith({
    String? id,
    Value<String?> isbn = const Value.absent(),
    Value<String?> title = const Value.absent(),
    Value<String?> author = const Value.absent(),
    Value<String?> author2 = const Value.absent(),
    Value<String?> author3 = const Value.absent(),
    Value<String?> author4 = const Value.absent(),
    Value<String?> author5 = const Value.absent(),
    Value<String?> publisher = const Value.absent(),
    Value<String?> year = const Value.absent(),
    int? quantity,
    Value<String?> condition = const Value.absent(),
    Value<String?> category = const Value.absent(),
    Value<String?> shelfLocation = const Value.absent(),
    Value<String?> notes = const Value.absent(),
    String? schoolId,
    String? clerkId,
    bool? flaggedAsDuplicate,
    String? syncState,
    DateTime? updatedAt,
  }) => Book(
    id: id ?? this.id,
    isbn: isbn.present ? isbn.value : this.isbn,
    title: title.present ? title.value : this.title,
    author: author.present ? author.value : this.author,
    author2: author2.present ? author2.value : this.author2,
    author3: author3.present ? author3.value : this.author3,
    author4: author4.present ? author4.value : this.author4,
    author5: author5.present ? author5.value : this.author5,
    publisher: publisher.present ? publisher.value : this.publisher,
    year: year.present ? year.value : this.year,
    quantity: quantity ?? this.quantity,
    condition: condition.present ? condition.value : this.condition,
    category: category.present ? category.value : this.category,
    shelfLocation: shelfLocation.present
        ? shelfLocation.value
        : this.shelfLocation,
    notes: notes.present ? notes.value : this.notes,
    schoolId: schoolId ?? this.schoolId,
    clerkId: clerkId ?? this.clerkId,
    flaggedAsDuplicate: flaggedAsDuplicate ?? this.flaggedAsDuplicate,
    syncState: syncState ?? this.syncState,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  Book copyWithCompanion(BooksCompanion data) {
    return Book(
      id: data.id.present ? data.id.value : this.id,
      isbn: data.isbn.present ? data.isbn.value : this.isbn,
      title: data.title.present ? data.title.value : this.title,
      author: data.author.present ? data.author.value : this.author,
      author2: data.author2.present ? data.author2.value : this.author2,
      author3: data.author3.present ? data.author3.value : this.author3,
      author4: data.author4.present ? data.author4.value : this.author4,
      author5: data.author5.present ? data.author5.value : this.author5,
      publisher: data.publisher.present ? data.publisher.value : this.publisher,
      year: data.year.present ? data.year.value : this.year,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      condition: data.condition.present ? data.condition.value : this.condition,
      category: data.category.present ? data.category.value : this.category,
      shelfLocation: data.shelfLocation.present
          ? data.shelfLocation.value
          : this.shelfLocation,
      notes: data.notes.present ? data.notes.value : this.notes,
      schoolId: data.schoolId.present ? data.schoolId.value : this.schoolId,
      clerkId: data.clerkId.present ? data.clerkId.value : this.clerkId,
      flaggedAsDuplicate: data.flaggedAsDuplicate.present
          ? data.flaggedAsDuplicate.value
          : this.flaggedAsDuplicate,
      syncState: data.syncState.present ? data.syncState.value : this.syncState,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Book(')
          ..write('id: $id, ')
          ..write('isbn: $isbn, ')
          ..write('title: $title, ')
          ..write('author: $author, ')
          ..write('author2: $author2, ')
          ..write('author3: $author3, ')
          ..write('author4: $author4, ')
          ..write('author5: $author5, ')
          ..write('publisher: $publisher, ')
          ..write('year: $year, ')
          ..write('quantity: $quantity, ')
          ..write('condition: $condition, ')
          ..write('category: $category, ')
          ..write('shelfLocation: $shelfLocation, ')
          ..write('notes: $notes, ')
          ..write('schoolId: $schoolId, ')
          ..write('clerkId: $clerkId, ')
          ..write('flaggedAsDuplicate: $flaggedAsDuplicate, ')
          ..write('syncState: $syncState, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    isbn,
    title,
    author,
    author2,
    author3,
    author4,
    author5,
    publisher,
    year,
    quantity,
    condition,
    category,
    shelfLocation,
    notes,
    schoolId,
    clerkId,
    flaggedAsDuplicate,
    syncState,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Book &&
          other.id == this.id &&
          other.isbn == this.isbn &&
          other.title == this.title &&
          other.author == this.author &&
          other.author2 == this.author2 &&
          other.author3 == this.author3 &&
          other.author4 == this.author4 &&
          other.author5 == this.author5 &&
          other.publisher == this.publisher &&
          other.year == this.year &&
          other.quantity == this.quantity &&
          other.condition == this.condition &&
          other.category == this.category &&
          other.shelfLocation == this.shelfLocation &&
          other.notes == this.notes &&
          other.schoolId == this.schoolId &&
          other.clerkId == this.clerkId &&
          other.flaggedAsDuplicate == this.flaggedAsDuplicate &&
          other.syncState == this.syncState &&
          other.updatedAt == this.updatedAt);
}

class BooksCompanion extends UpdateCompanion<Book> {
  final Value<String> id;
  final Value<String?> isbn;
  final Value<String?> title;
  final Value<String?> author;
  final Value<String?> author2;
  final Value<String?> author3;
  final Value<String?> author4;
  final Value<String?> author5;
  final Value<String?> publisher;
  final Value<String?> year;
  final Value<int> quantity;
  final Value<String?> condition;
  final Value<String?> category;
  final Value<String?> shelfLocation;
  final Value<String?> notes;
  final Value<String> schoolId;
  final Value<String> clerkId;
  final Value<bool> flaggedAsDuplicate;
  final Value<String> syncState;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const BooksCompanion({
    this.id = const Value.absent(),
    this.isbn = const Value.absent(),
    this.title = const Value.absent(),
    this.author = const Value.absent(),
    this.author2 = const Value.absent(),
    this.author3 = const Value.absent(),
    this.author4 = const Value.absent(),
    this.author5 = const Value.absent(),
    this.publisher = const Value.absent(),
    this.year = const Value.absent(),
    this.quantity = const Value.absent(),
    this.condition = const Value.absent(),
    this.category = const Value.absent(),
    this.shelfLocation = const Value.absent(),
    this.notes = const Value.absent(),
    this.schoolId = const Value.absent(),
    this.clerkId = const Value.absent(),
    this.flaggedAsDuplicate = const Value.absent(),
    this.syncState = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  BooksCompanion.insert({
    required String id,
    this.isbn = const Value.absent(),
    this.title = const Value.absent(),
    this.author = const Value.absent(),
    this.author2 = const Value.absent(),
    this.author3 = const Value.absent(),
    this.author4 = const Value.absent(),
    this.author5 = const Value.absent(),
    this.publisher = const Value.absent(),
    this.year = const Value.absent(),
    this.quantity = const Value.absent(),
    this.condition = const Value.absent(),
    this.category = const Value.absent(),
    this.shelfLocation = const Value.absent(),
    this.notes = const Value.absent(),
    required String schoolId,
    required String clerkId,
    this.flaggedAsDuplicate = const Value.absent(),
    this.syncState = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       schoolId = Value(schoolId),
       clerkId = Value(clerkId);
  static Insertable<Book> custom({
    Expression<String>? id,
    Expression<String>? isbn,
    Expression<String>? title,
    Expression<String>? author,
    Expression<String>? author2,
    Expression<String>? author3,
    Expression<String>? author4,
    Expression<String>? author5,
    Expression<String>? publisher,
    Expression<String>? year,
    Expression<int>? quantity,
    Expression<String>? condition,
    Expression<String>? category,
    Expression<String>? shelfLocation,
    Expression<String>? notes,
    Expression<String>? schoolId,
    Expression<String>? clerkId,
    Expression<bool>? flaggedAsDuplicate,
    Expression<String>? syncState,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (isbn != null) 'isbn': isbn,
      if (title != null) 'title': title,
      if (author != null) 'author': author,
      if (author2 != null) 'author2': author2,
      if (author3 != null) 'author3': author3,
      if (author4 != null) 'author4': author4,
      if (author5 != null) 'author5': author5,
      if (publisher != null) 'publisher': publisher,
      if (year != null) 'year': year,
      if (quantity != null) 'quantity': quantity,
      if (condition != null) 'condition': condition,
      if (category != null) 'category': category,
      if (shelfLocation != null) 'shelf_location': shelfLocation,
      if (notes != null) 'notes': notes,
      if (schoolId != null) 'school_id': schoolId,
      if (clerkId != null) 'clerk_id': clerkId,
      if (flaggedAsDuplicate != null)
        'flagged_as_duplicate': flaggedAsDuplicate,
      if (syncState != null) 'sync_state': syncState,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  BooksCompanion copyWith({
    Value<String>? id,
    Value<String?>? isbn,
    Value<String?>? title,
    Value<String?>? author,
    Value<String?>? author2,
    Value<String?>? author3,
    Value<String?>? author4,
    Value<String?>? author5,
    Value<String?>? publisher,
    Value<String?>? year,
    Value<int>? quantity,
    Value<String?>? condition,
    Value<String?>? category,
    Value<String?>? shelfLocation,
    Value<String?>? notes,
    Value<String>? schoolId,
    Value<String>? clerkId,
    Value<bool>? flaggedAsDuplicate,
    Value<String>? syncState,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return BooksCompanion(
      id: id ?? this.id,
      isbn: isbn ?? this.isbn,
      title: title ?? this.title,
      author: author ?? this.author,
      author2: author2 ?? this.author2,
      author3: author3 ?? this.author3,
      author4: author4 ?? this.author4,
      author5: author5 ?? this.author5,
      publisher: publisher ?? this.publisher,
      year: year ?? this.year,
      quantity: quantity ?? this.quantity,
      condition: condition ?? this.condition,
      category: category ?? this.category,
      shelfLocation: shelfLocation ?? this.shelfLocation,
      notes: notes ?? this.notes,
      schoolId: schoolId ?? this.schoolId,
      clerkId: clerkId ?? this.clerkId,
      flaggedAsDuplicate: flaggedAsDuplicate ?? this.flaggedAsDuplicate,
      syncState: syncState ?? this.syncState,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (isbn.present) {
      map['isbn'] = Variable<String>(isbn.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (author.present) {
      map['author'] = Variable<String>(author.value);
    }
    if (author2.present) {
      map['author2'] = Variable<String>(author2.value);
    }
    if (author3.present) {
      map['author3'] = Variable<String>(author3.value);
    }
    if (author4.present) {
      map['author4'] = Variable<String>(author4.value);
    }
    if (author5.present) {
      map['author5'] = Variable<String>(author5.value);
    }
    if (publisher.present) {
      map['publisher'] = Variable<String>(publisher.value);
    }
    if (year.present) {
      map['year'] = Variable<String>(year.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<int>(quantity.value);
    }
    if (condition.present) {
      map['condition'] = Variable<String>(condition.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (shelfLocation.present) {
      map['shelf_location'] = Variable<String>(shelfLocation.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    if (schoolId.present) {
      map['school_id'] = Variable<String>(schoolId.value);
    }
    if (clerkId.present) {
      map['clerk_id'] = Variable<String>(clerkId.value);
    }
    if (flaggedAsDuplicate.present) {
      map['flagged_as_duplicate'] = Variable<bool>(flaggedAsDuplicate.value);
    }
    if (syncState.present) {
      map['sync_state'] = Variable<String>(syncState.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BooksCompanion(')
          ..write('id: $id, ')
          ..write('isbn: $isbn, ')
          ..write('title: $title, ')
          ..write('author: $author, ')
          ..write('author2: $author2, ')
          ..write('author3: $author3, ')
          ..write('author4: $author4, ')
          ..write('author5: $author5, ')
          ..write('publisher: $publisher, ')
          ..write('year: $year, ')
          ..write('quantity: $quantity, ')
          ..write('condition: $condition, ')
          ..write('category: $category, ')
          ..write('shelfLocation: $shelfLocation, ')
          ..write('notes: $notes, ')
          ..write('schoolId: $schoolId, ')
          ..write('clerkId: $clerkId, ')
          ..write('flaggedAsDuplicate: $flaggedAsDuplicate, ')
          ..write('syncState: $syncState, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OutboxTable extends Outbox with TableInfo<$OutboxTable, OutboxData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OutboxTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _seqMeta = const VerificationMeta('seq');
  @override
  late final GeneratedColumn<int> seq = GeneratedColumn<int>(
    'seq',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _entityMeta = const VerificationMeta('entity');
  @override
  late final GeneratedColumn<String> entity = GeneratedColumn<String>(
    'entity',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entityIdMeta = const VerificationMeta(
    'entityId',
  );
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
    'entity_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _opMeta = const VerificationMeta('op');
  @override
  late final GeneratedColumn<String> op = GeneratedColumn<String>(
    'op',
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
  static const VerificationMeta _attemptsMeta = const VerificationMeta(
    'attempts',
  );
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
    'attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastErrorMeta = const VerificationMeta(
    'lastError',
  );
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
    'last_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    seq,
    entity,
    entityId,
    op,
    payload,
    attempts,
    lastError,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'outbox';
  @override
  VerificationContext validateIntegrity(
    Insertable<OutboxData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('seq')) {
      context.handle(
        _seqMeta,
        seq.isAcceptableOrUnknown(data['seq']!, _seqMeta),
      );
    }
    if (data.containsKey('entity')) {
      context.handle(
        _entityMeta,
        entity.isAcceptableOrUnknown(data['entity']!, _entityMeta),
      );
    } else if (isInserting) {
      context.missing(_entityMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(
        _entityIdMeta,
        entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta),
      );
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('op')) {
      context.handle(_opMeta, op.isAcceptableOrUnknown(data['op']!, _opMeta));
    } else if (isInserting) {
      context.missing(_opMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('attempts')) {
      context.handle(
        _attemptsMeta,
        attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta),
      );
    }
    if (data.containsKey('last_error')) {
      context.handle(
        _lastErrorMeta,
        lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {seq};
  @override
  OutboxData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OutboxData(
      seq: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}seq'],
      )!,
      entity: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entity'],
      )!,
      entityId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entity_id'],
      )!,
      op: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}op'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      attempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempts'],
      )!,
      lastError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $OutboxTable createAlias(String alias) {
    return $OutboxTable(attachedDatabase, alias);
  }
}

class OutboxData extends DataClass implements Insertable<OutboxData> {
  final int seq;
  final String entity;
  final String entityId;
  final String op;
  final String payload;
  final int attempts;
  final String? lastError;
  final DateTime createdAt;
  const OutboxData({
    required this.seq,
    required this.entity,
    required this.entityId,
    required this.op,
    required this.payload,
    required this.attempts,
    this.lastError,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['seq'] = Variable<int>(seq);
    map['entity'] = Variable<String>(entity);
    map['entity_id'] = Variable<String>(entityId);
    map['op'] = Variable<String>(op);
    map['payload'] = Variable<String>(payload);
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  OutboxCompanion toCompanion(bool nullToAbsent) {
    return OutboxCompanion(
      seq: Value(seq),
      entity: Value(entity),
      entityId: Value(entityId),
      op: Value(op),
      payload: Value(payload),
      attempts: Value(attempts),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      createdAt: Value(createdAt),
    );
  }

  factory OutboxData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OutboxData(
      seq: serializer.fromJson<int>(json['seq']),
      entity: serializer.fromJson<String>(json['entity']),
      entityId: serializer.fromJson<String>(json['entityId']),
      op: serializer.fromJson<String>(json['op']),
      payload: serializer.fromJson<String>(json['payload']),
      attempts: serializer.fromJson<int>(json['attempts']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'seq': serializer.toJson<int>(seq),
      'entity': serializer.toJson<String>(entity),
      'entityId': serializer.toJson<String>(entityId),
      'op': serializer.toJson<String>(op),
      'payload': serializer.toJson<String>(payload),
      'attempts': serializer.toJson<int>(attempts),
      'lastError': serializer.toJson<String?>(lastError),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  OutboxData copyWith({
    int? seq,
    String? entity,
    String? entityId,
    String? op,
    String? payload,
    int? attempts,
    Value<String?> lastError = const Value.absent(),
    DateTime? createdAt,
  }) => OutboxData(
    seq: seq ?? this.seq,
    entity: entity ?? this.entity,
    entityId: entityId ?? this.entityId,
    op: op ?? this.op,
    payload: payload ?? this.payload,
    attempts: attempts ?? this.attempts,
    lastError: lastError.present ? lastError.value : this.lastError,
    createdAt: createdAt ?? this.createdAt,
  );
  OutboxData copyWithCompanion(OutboxCompanion data) {
    return OutboxData(
      seq: data.seq.present ? data.seq.value : this.seq,
      entity: data.entity.present ? data.entity.value : this.entity,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      op: data.op.present ? data.op.value : this.op,
      payload: data.payload.present ? data.payload.value : this.payload,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OutboxData(')
          ..write('seq: $seq, ')
          ..write('entity: $entity, ')
          ..write('entityId: $entityId, ')
          ..write('op: $op, ')
          ..write('payload: $payload, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    seq,
    entity,
    entityId,
    op,
    payload,
    attempts,
    lastError,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OutboxData &&
          other.seq == this.seq &&
          other.entity == this.entity &&
          other.entityId == this.entityId &&
          other.op == this.op &&
          other.payload == this.payload &&
          other.attempts == this.attempts &&
          other.lastError == this.lastError &&
          other.createdAt == this.createdAt);
}

class OutboxCompanion extends UpdateCompanion<OutboxData> {
  final Value<int> seq;
  final Value<String> entity;
  final Value<String> entityId;
  final Value<String> op;
  final Value<String> payload;
  final Value<int> attempts;
  final Value<String?> lastError;
  final Value<DateTime> createdAt;
  const OutboxCompanion({
    this.seq = const Value.absent(),
    this.entity = const Value.absent(),
    this.entityId = const Value.absent(),
    this.op = const Value.absent(),
    this.payload = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  OutboxCompanion.insert({
    this.seq = const Value.absent(),
    required String entity,
    required String entityId,
    required String op,
    required String payload,
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.createdAt = const Value.absent(),
  }) : entity = Value(entity),
       entityId = Value(entityId),
       op = Value(op),
       payload = Value(payload);
  static Insertable<OutboxData> custom({
    Expression<int>? seq,
    Expression<String>? entity,
    Expression<String>? entityId,
    Expression<String>? op,
    Expression<String>? payload,
    Expression<int>? attempts,
    Expression<String>? lastError,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (seq != null) 'seq': seq,
      if (entity != null) 'entity': entity,
      if (entityId != null) 'entity_id': entityId,
      if (op != null) 'op': op,
      if (payload != null) 'payload': payload,
      if (attempts != null) 'attempts': attempts,
      if (lastError != null) 'last_error': lastError,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  OutboxCompanion copyWith({
    Value<int>? seq,
    Value<String>? entity,
    Value<String>? entityId,
    Value<String>? op,
    Value<String>? payload,
    Value<int>? attempts,
    Value<String?>? lastError,
    Value<DateTime>? createdAt,
  }) {
    return OutboxCompanion(
      seq: seq ?? this.seq,
      entity: entity ?? this.entity,
      entityId: entityId ?? this.entityId,
      op: op ?? this.op,
      payload: payload ?? this.payload,
      attempts: attempts ?? this.attempts,
      lastError: lastError ?? this.lastError,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (seq.present) {
      map['seq'] = Variable<int>(seq.value);
    }
    if (entity.present) {
      map['entity'] = Variable<String>(entity.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (op.present) {
      map['op'] = Variable<String>(op.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OutboxCompanion(')
          ..write('seq: $seq, ')
          ..write('entity: $entity, ')
          ..write('entityId: $entityId, ')
          ..write('op: $op, ')
          ..write('payload: $payload, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $MetadataCacheTable extends MetadataCache
    with TableInfo<$MetadataCacheTable, MetadataCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MetadataCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _isbnMeta = const VerificationMeta('isbn');
  @override
  late final GeneratedColumn<String> isbn = GeneratedColumn<String>(
    'isbn',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _authorMeta = const VerificationMeta('author');
  @override
  late final GeneratedColumn<String> author = GeneratedColumn<String>(
    'author',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author2Meta = const VerificationMeta(
    'author2',
  );
  @override
  late final GeneratedColumn<String> author2 = GeneratedColumn<String>(
    'author2',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author3Meta = const VerificationMeta(
    'author3',
  );
  @override
  late final GeneratedColumn<String> author3 = GeneratedColumn<String>(
    'author3',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author4Meta = const VerificationMeta(
    'author4',
  );
  @override
  late final GeneratedColumn<String> author4 = GeneratedColumn<String>(
    'author4',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _author5Meta = const VerificationMeta(
    'author5',
  );
  @override
  late final GeneratedColumn<String> author5 = GeneratedColumn<String>(
    'author5',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _publisherMeta = const VerificationMeta(
    'publisher',
  );
  @override
  late final GeneratedColumn<String> publisher = GeneratedColumn<String>(
    'publisher',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _yearMeta = const VerificationMeta('year');
  @override
  late final GeneratedColumn<String> year = GeneratedColumn<String>(
    'year',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    isbn,
    title,
    author,
    author2,
    author3,
    author4,
    author5,
    publisher,
    year,
    category,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'metadata_cache';
  @override
  VerificationContext validateIntegrity(
    Insertable<MetadataCacheData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('isbn')) {
      context.handle(
        _isbnMeta,
        isbn.isAcceptableOrUnknown(data['isbn']!, _isbnMeta),
      );
    } else if (isInserting) {
      context.missing(_isbnMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    }
    if (data.containsKey('author')) {
      context.handle(
        _authorMeta,
        author.isAcceptableOrUnknown(data['author']!, _authorMeta),
      );
    }
    if (data.containsKey('author2')) {
      context.handle(
        _author2Meta,
        author2.isAcceptableOrUnknown(data['author2']!, _author2Meta),
      );
    }
    if (data.containsKey('author3')) {
      context.handle(
        _author3Meta,
        author3.isAcceptableOrUnknown(data['author3']!, _author3Meta),
      );
    }
    if (data.containsKey('author4')) {
      context.handle(
        _author4Meta,
        author4.isAcceptableOrUnknown(data['author4']!, _author4Meta),
      );
    }
    if (data.containsKey('author5')) {
      context.handle(
        _author5Meta,
        author5.isAcceptableOrUnknown(data['author5']!, _author5Meta),
      );
    }
    if (data.containsKey('publisher')) {
      context.handle(
        _publisherMeta,
        publisher.isAcceptableOrUnknown(data['publisher']!, _publisherMeta),
      );
    }
    if (data.containsKey('year')) {
      context.handle(
        _yearMeta,
        year.isAcceptableOrUnknown(data['year']!, _yearMeta),
      );
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {isbn};
  @override
  MetadataCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MetadataCacheData(
      isbn: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}isbn'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      ),
      author: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author'],
      ),
      author2: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author2'],
      ),
      author3: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author3'],
      ),
      author4: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author4'],
      ),
      author5: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}author5'],
      ),
      publisher: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}publisher'],
      ),
      year: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}year'],
      ),
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      ),
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $MetadataCacheTable createAlias(String alias) {
    return $MetadataCacheTable(attachedDatabase, alias);
  }
}

class MetadataCacheData extends DataClass
    implements Insertable<MetadataCacheData> {
  final String isbn;
  final String? title;
  final String? author;
  final String? author2;
  final String? author3;
  final String? author4;
  final String? author5;
  final String? publisher;
  final String? year;
  final String? category;
  final DateTime updatedAt;
  const MetadataCacheData({
    required this.isbn,
    this.title,
    this.author,
    this.author2,
    this.author3,
    this.author4,
    this.author5,
    this.publisher,
    this.year,
    this.category,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['isbn'] = Variable<String>(isbn);
    if (!nullToAbsent || title != null) {
      map['title'] = Variable<String>(title);
    }
    if (!nullToAbsent || author != null) {
      map['author'] = Variable<String>(author);
    }
    if (!nullToAbsent || author2 != null) {
      map['author2'] = Variable<String>(author2);
    }
    if (!nullToAbsent || author3 != null) {
      map['author3'] = Variable<String>(author3);
    }
    if (!nullToAbsent || author4 != null) {
      map['author4'] = Variable<String>(author4);
    }
    if (!nullToAbsent || author5 != null) {
      map['author5'] = Variable<String>(author5);
    }
    if (!nullToAbsent || publisher != null) {
      map['publisher'] = Variable<String>(publisher);
    }
    if (!nullToAbsent || year != null) {
      map['year'] = Variable<String>(year);
    }
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  MetadataCacheCompanion toCompanion(bool nullToAbsent) {
    return MetadataCacheCompanion(
      isbn: Value(isbn),
      title: title == null && nullToAbsent
          ? const Value.absent()
          : Value(title),
      author: author == null && nullToAbsent
          ? const Value.absent()
          : Value(author),
      author2: author2 == null && nullToAbsent
          ? const Value.absent()
          : Value(author2),
      author3: author3 == null && nullToAbsent
          ? const Value.absent()
          : Value(author3),
      author4: author4 == null && nullToAbsent
          ? const Value.absent()
          : Value(author4),
      author5: author5 == null && nullToAbsent
          ? const Value.absent()
          : Value(author5),
      publisher: publisher == null && nullToAbsent
          ? const Value.absent()
          : Value(publisher),
      year: year == null && nullToAbsent ? const Value.absent() : Value(year),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      updatedAt: Value(updatedAt),
    );
  }

  factory MetadataCacheData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MetadataCacheData(
      isbn: serializer.fromJson<String>(json['isbn']),
      title: serializer.fromJson<String?>(json['title']),
      author: serializer.fromJson<String?>(json['author']),
      author2: serializer.fromJson<String?>(json['author2']),
      author3: serializer.fromJson<String?>(json['author3']),
      author4: serializer.fromJson<String?>(json['author4']),
      author5: serializer.fromJson<String?>(json['author5']),
      publisher: serializer.fromJson<String?>(json['publisher']),
      year: serializer.fromJson<String?>(json['year']),
      category: serializer.fromJson<String?>(json['category']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'isbn': serializer.toJson<String>(isbn),
      'title': serializer.toJson<String?>(title),
      'author': serializer.toJson<String?>(author),
      'author2': serializer.toJson<String?>(author2),
      'author3': serializer.toJson<String?>(author3),
      'author4': serializer.toJson<String?>(author4),
      'author5': serializer.toJson<String?>(author5),
      'publisher': serializer.toJson<String?>(publisher),
      'year': serializer.toJson<String?>(year),
      'category': serializer.toJson<String?>(category),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  MetadataCacheData copyWith({
    String? isbn,
    Value<String?> title = const Value.absent(),
    Value<String?> author = const Value.absent(),
    Value<String?> author2 = const Value.absent(),
    Value<String?> author3 = const Value.absent(),
    Value<String?> author4 = const Value.absent(),
    Value<String?> author5 = const Value.absent(),
    Value<String?> publisher = const Value.absent(),
    Value<String?> year = const Value.absent(),
    Value<String?> category = const Value.absent(),
    DateTime? updatedAt,
  }) => MetadataCacheData(
    isbn: isbn ?? this.isbn,
    title: title.present ? title.value : this.title,
    author: author.present ? author.value : this.author,
    author2: author2.present ? author2.value : this.author2,
    author3: author3.present ? author3.value : this.author3,
    author4: author4.present ? author4.value : this.author4,
    author5: author5.present ? author5.value : this.author5,
    publisher: publisher.present ? publisher.value : this.publisher,
    year: year.present ? year.value : this.year,
    category: category.present ? category.value : this.category,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  MetadataCacheData copyWithCompanion(MetadataCacheCompanion data) {
    return MetadataCacheData(
      isbn: data.isbn.present ? data.isbn.value : this.isbn,
      title: data.title.present ? data.title.value : this.title,
      author: data.author.present ? data.author.value : this.author,
      author2: data.author2.present ? data.author2.value : this.author2,
      author3: data.author3.present ? data.author3.value : this.author3,
      author4: data.author4.present ? data.author4.value : this.author4,
      author5: data.author5.present ? data.author5.value : this.author5,
      publisher: data.publisher.present ? data.publisher.value : this.publisher,
      year: data.year.present ? data.year.value : this.year,
      category: data.category.present ? data.category.value : this.category,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MetadataCacheData(')
          ..write('isbn: $isbn, ')
          ..write('title: $title, ')
          ..write('author: $author, ')
          ..write('author2: $author2, ')
          ..write('author3: $author3, ')
          ..write('author4: $author4, ')
          ..write('author5: $author5, ')
          ..write('publisher: $publisher, ')
          ..write('year: $year, ')
          ..write('category: $category, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    isbn,
    title,
    author,
    author2,
    author3,
    author4,
    author5,
    publisher,
    year,
    category,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MetadataCacheData &&
          other.isbn == this.isbn &&
          other.title == this.title &&
          other.author == this.author &&
          other.author2 == this.author2 &&
          other.author3 == this.author3 &&
          other.author4 == this.author4 &&
          other.author5 == this.author5 &&
          other.publisher == this.publisher &&
          other.year == this.year &&
          other.category == this.category &&
          other.updatedAt == this.updatedAt);
}

class MetadataCacheCompanion extends UpdateCompanion<MetadataCacheData> {
  final Value<String> isbn;
  final Value<String?> title;
  final Value<String?> author;
  final Value<String?> author2;
  final Value<String?> author3;
  final Value<String?> author4;
  final Value<String?> author5;
  final Value<String?> publisher;
  final Value<String?> year;
  final Value<String?> category;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const MetadataCacheCompanion({
    this.isbn = const Value.absent(),
    this.title = const Value.absent(),
    this.author = const Value.absent(),
    this.author2 = const Value.absent(),
    this.author3 = const Value.absent(),
    this.author4 = const Value.absent(),
    this.author5 = const Value.absent(),
    this.publisher = const Value.absent(),
    this.year = const Value.absent(),
    this.category = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MetadataCacheCompanion.insert({
    required String isbn,
    this.title = const Value.absent(),
    this.author = const Value.absent(),
    this.author2 = const Value.absent(),
    this.author3 = const Value.absent(),
    this.author4 = const Value.absent(),
    this.author5 = const Value.absent(),
    this.publisher = const Value.absent(),
    this.year = const Value.absent(),
    this.category = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : isbn = Value(isbn);
  static Insertable<MetadataCacheData> custom({
    Expression<String>? isbn,
    Expression<String>? title,
    Expression<String>? author,
    Expression<String>? author2,
    Expression<String>? author3,
    Expression<String>? author4,
    Expression<String>? author5,
    Expression<String>? publisher,
    Expression<String>? year,
    Expression<String>? category,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (isbn != null) 'isbn': isbn,
      if (title != null) 'title': title,
      if (author != null) 'author': author,
      if (author2 != null) 'author2': author2,
      if (author3 != null) 'author3': author3,
      if (author4 != null) 'author4': author4,
      if (author5 != null) 'author5': author5,
      if (publisher != null) 'publisher': publisher,
      if (year != null) 'year': year,
      if (category != null) 'category': category,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MetadataCacheCompanion copyWith({
    Value<String>? isbn,
    Value<String?>? title,
    Value<String?>? author,
    Value<String?>? author2,
    Value<String?>? author3,
    Value<String?>? author4,
    Value<String?>? author5,
    Value<String?>? publisher,
    Value<String?>? year,
    Value<String?>? category,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return MetadataCacheCompanion(
      isbn: isbn ?? this.isbn,
      title: title ?? this.title,
      author: author ?? this.author,
      author2: author2 ?? this.author2,
      author3: author3 ?? this.author3,
      author4: author4 ?? this.author4,
      author5: author5 ?? this.author5,
      publisher: publisher ?? this.publisher,
      year: year ?? this.year,
      category: category ?? this.category,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (isbn.present) {
      map['isbn'] = Variable<String>(isbn.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (author.present) {
      map['author'] = Variable<String>(author.value);
    }
    if (author2.present) {
      map['author2'] = Variable<String>(author2.value);
    }
    if (author3.present) {
      map['author3'] = Variable<String>(author3.value);
    }
    if (author4.present) {
      map['author4'] = Variable<String>(author4.value);
    }
    if (author5.present) {
      map['author5'] = Variable<String>(author5.value);
    }
    if (publisher.present) {
      map['publisher'] = Variable<String>(publisher.value);
    }
    if (year.present) {
      map['year'] = Variable<String>(year.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MetadataCacheCompanion(')
          ..write('isbn: $isbn, ')
          ..write('title: $title, ')
          ..write('author: $author, ')
          ..write('author2: $author2, ')
          ..write('author3: $author3, ')
          ..write('author4: $author4, ')
          ..write('author5: $author5, ')
          ..write('publisher: $publisher, ')
          ..write('year: $year, ')
          ..write('category: $category, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SchoolsTableTable extends SchoolsTable
    with TableInfo<$SchoolsTableTable, SchoolsTableData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SchoolsTableTable(this.attachedDatabase, [this._alias]);
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
  static const VerificationMeta _districtMeta = const VerificationMeta(
    'district',
  );
  @override
  late final GeneratedColumn<String> district = GeneratedColumn<String>(
    'district',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _regionMeta = const VerificationMeta('region');
  @override
  late final GeneratedColumn<String> region = GeneratedColumn<String>(
    'region',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _activeMeta = const VerificationMeta('active');
  @override
  late final GeneratedColumn<bool> active = GeneratedColumn<bool>(
    'active',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("active" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  @override
  List<GeneratedColumn> get $columns => [id, name, district, region, active];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'schools_table';
  @override
  VerificationContext validateIntegrity(
    Insertable<SchoolsTableData> instance, {
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
    if (data.containsKey('district')) {
      context.handle(
        _districtMeta,
        district.isAcceptableOrUnknown(data['district']!, _districtMeta),
      );
    }
    if (data.containsKey('region')) {
      context.handle(
        _regionMeta,
        region.isAcceptableOrUnknown(data['region']!, _regionMeta),
      );
    }
    if (data.containsKey('active')) {
      context.handle(
        _activeMeta,
        active.isAcceptableOrUnknown(data['active']!, _activeMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SchoolsTableData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SchoolsTableData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      district: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}district'],
      ),
      region: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}region'],
      ),
      active: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}active'],
      )!,
    );
  }

  @override
  $SchoolsTableTable createAlias(String alias) {
    return $SchoolsTableTable(attachedDatabase, alias);
  }
}

class SchoolsTableData extends DataClass
    implements Insertable<SchoolsTableData> {
  final String id;
  final String name;
  final String? district;
  final String? region;
  final bool active;
  const SchoolsTableData({
    required this.id,
    required this.name,
    this.district,
    this.region,
    required this.active,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || district != null) {
      map['district'] = Variable<String>(district);
    }
    if (!nullToAbsent || region != null) {
      map['region'] = Variable<String>(region);
    }
    map['active'] = Variable<bool>(active);
    return map;
  }

  SchoolsTableCompanion toCompanion(bool nullToAbsent) {
    return SchoolsTableCompanion(
      id: Value(id),
      name: Value(name),
      district: district == null && nullToAbsent
          ? const Value.absent()
          : Value(district),
      region: region == null && nullToAbsent
          ? const Value.absent()
          : Value(region),
      active: Value(active),
    );
  }

  factory SchoolsTableData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SchoolsTableData(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      district: serializer.fromJson<String?>(json['district']),
      region: serializer.fromJson<String?>(json['region']),
      active: serializer.fromJson<bool>(json['active']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'district': serializer.toJson<String?>(district),
      'region': serializer.toJson<String?>(region),
      'active': serializer.toJson<bool>(active),
    };
  }

  SchoolsTableData copyWith({
    String? id,
    String? name,
    Value<String?> district = const Value.absent(),
    Value<String?> region = const Value.absent(),
    bool? active,
  }) => SchoolsTableData(
    id: id ?? this.id,
    name: name ?? this.name,
    district: district.present ? district.value : this.district,
    region: region.present ? region.value : this.region,
    active: active ?? this.active,
  );
  SchoolsTableData copyWithCompanion(SchoolsTableCompanion data) {
    return SchoolsTableData(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      district: data.district.present ? data.district.value : this.district,
      region: data.region.present ? data.region.value : this.region,
      active: data.active.present ? data.active.value : this.active,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SchoolsTableData(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('district: $district, ')
          ..write('region: $region, ')
          ..write('active: $active')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, name, district, region, active);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SchoolsTableData &&
          other.id == this.id &&
          other.name == this.name &&
          other.district == this.district &&
          other.region == this.region &&
          other.active == this.active);
}

class SchoolsTableCompanion extends UpdateCompanion<SchoolsTableData> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> district;
  final Value<String?> region;
  final Value<bool> active;
  final Value<int> rowid;
  const SchoolsTableCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.district = const Value.absent(),
    this.region = const Value.absent(),
    this.active = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SchoolsTableCompanion.insert({
    required String id,
    required String name,
    this.district = const Value.absent(),
    this.region = const Value.absent(),
    this.active = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name);
  static Insertable<SchoolsTableData> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? district,
    Expression<String>? region,
    Expression<bool>? active,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (district != null) 'district': district,
      if (region != null) 'region': region,
      if (active != null) 'active': active,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SchoolsTableCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<String?>? district,
    Value<String?>? region,
    Value<bool>? active,
    Value<int>? rowid,
  }) {
    return SchoolsTableCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      district: district ?? this.district,
      region: region ?? this.region,
      active: active ?? this.active,
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
    if (district.present) {
      map['district'] = Variable<String>(district.value);
    }
    if (region.present) {
      map['region'] = Variable<String>(region.value);
    }
    if (active.present) {
      map['active'] = Variable<bool>(active.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SchoolsTableCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('district: $district, ')
          ..write('region: $region, ')
          ..write('active: $active, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $BooksTable books = $BooksTable(this);
  late final $OutboxTable outbox = $OutboxTable(this);
  late final $MetadataCacheTable metadataCache = $MetadataCacheTable(this);
  late final $SchoolsTableTable schoolsTable = $SchoolsTableTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    books,
    outbox,
    metadataCache,
    schoolsTable,
  ];
}

typedef $$BooksTableCreateCompanionBuilder = BooksCompanion Function({
  required String id,
  Value<String?> isbn,
  Value<String?> title,
  Value<String?> author,
  Value<String?> author2,
  Value<String?> author3,
  Value<String?> author4,
  Value<String?> author5,
  Value<String?> publisher,
  Value<String?> year,
  Value<int> quantity,
  Value<String?> condition,
  Value<String?> category,
  Value<String?> shelfLocation,
  Value<String?> notes,
  required String schoolId,
  required String clerkId,
  Value<bool> flaggedAsDuplicate,
  Value<String> syncState,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});
typedef $$BooksTableUpdateCompanionBuilder = BooksCompanion Function({
  Value<String> id,
  Value<String?> isbn,
  Value<String?> title,
  Value<String?> author,
  Value<String?> author2,
  Value<String?> author3,
  Value<String?> author4,
  Value<String?> author5,
  Value<String?> publisher,
  Value<String?> year,
  Value<int> quantity,
  Value<String?> condition,
  Value<String?> category,
  Value<String?> shelfLocation,
  Value<String?> notes,
  Value<String> schoolId,
  Value<String> clerkId,
  Value<bool> flaggedAsDuplicate,
  Value<String> syncState,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$BooksTableFilterComposer extends Composer<_$AppDatabase, $BooksTable> {
  $$BooksTableFilterComposer({
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

  ColumnFilters<String> get isbn => $composableBuilder(
    column: $table.isbn,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author => $composableBuilder(
    column: $table.author,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author2 => $composableBuilder(
    column: $table.author2,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author3 => $composableBuilder(
    column: $table.author3,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author4 => $composableBuilder(
    column: $table.author4,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author5 => $composableBuilder(
    column: $table.author5,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get publisher => $composableBuilder(
    column: $table.publisher,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get year => $composableBuilder(
    column: $table.year,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get condition => $composableBuilder(
    column: $table.condition,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get shelfLocation => $composableBuilder(
    column: $table.shelfLocation,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get schoolId => $composableBuilder(
    column: $table.schoolId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get clerkId => $composableBuilder(
    column: $table.clerkId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get flaggedAsDuplicate => $composableBuilder(
    column: $table.flaggedAsDuplicate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get syncState => $composableBuilder(
    column: $table.syncState,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$BooksTableOrderingComposer
    extends Composer<_$AppDatabase, $BooksTable> {
  $$BooksTableOrderingComposer({
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

  ColumnOrderings<String> get isbn => $composableBuilder(
    column: $table.isbn,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author => $composableBuilder(
    column: $table.author,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author2 => $composableBuilder(
    column: $table.author2,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author3 => $composableBuilder(
    column: $table.author3,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author4 => $composableBuilder(
    column: $table.author4,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author5 => $composableBuilder(
    column: $table.author5,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get publisher => $composableBuilder(
    column: $table.publisher,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get year => $composableBuilder(
    column: $table.year,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get quantity => $composableBuilder(
    column: $table.quantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get condition => $composableBuilder(
    column: $table.condition,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get shelfLocation => $composableBuilder(
    column: $table.shelfLocation,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get notes => $composableBuilder(
    column: $table.notes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get schoolId => $composableBuilder(
    column: $table.schoolId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get clerkId => $composableBuilder(
    column: $table.clerkId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get flaggedAsDuplicate => $composableBuilder(
    column: $table.flaggedAsDuplicate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get syncState => $composableBuilder(
    column: $table.syncState,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$BooksTableAnnotationComposer
    extends Composer<_$AppDatabase, $BooksTable> {
  $$BooksTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get isbn =>
      $composableBuilder(column: $table.isbn, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get author =>
      $composableBuilder(column: $table.author, builder: (column) => column);

  GeneratedColumn<String> get author2 =>
      $composableBuilder(column: $table.author2, builder: (column) => column);

  GeneratedColumn<String> get author3 =>
      $composableBuilder(column: $table.author3, builder: (column) => column);

  GeneratedColumn<String> get author4 =>
      $composableBuilder(column: $table.author4, builder: (column) => column);

  GeneratedColumn<String> get author5 =>
      $composableBuilder(column: $table.author5, builder: (column) => column);

  GeneratedColumn<String> get publisher =>
      $composableBuilder(column: $table.publisher, builder: (column) => column);

  GeneratedColumn<String> get year =>
      $composableBuilder(column: $table.year, builder: (column) => column);

  GeneratedColumn<int> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<String> get condition =>
      $composableBuilder(column: $table.condition, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<String> get shelfLocation => $composableBuilder(
    column: $table.shelfLocation,
    builder: (column) => column,
  );

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);

  GeneratedColumn<String> get schoolId =>
      $composableBuilder(column: $table.schoolId, builder: (column) => column);

  GeneratedColumn<String> get clerkId =>
      $composableBuilder(column: $table.clerkId, builder: (column) => column);

  GeneratedColumn<bool> get flaggedAsDuplicate => $composableBuilder(
    column: $table.flaggedAsDuplicate,
    builder: (column) => column,
  );

  GeneratedColumn<String> get syncState =>
      $composableBuilder(column: $table.syncState, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$BooksTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $BooksTable,
          Book,
          $$BooksTableFilterComposer,
          $$BooksTableOrderingComposer,
          $$BooksTableAnnotationComposer,
          $$BooksTableCreateCompanionBuilder,
          $$BooksTableUpdateCompanionBuilder,
          (Book, BaseReferences<_$AppDatabase, $BooksTable, Book>),
          Book,
          PrefetchHooks Function()
        > {
  $$BooksTableTableManager(_$AppDatabase db, $BooksTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$BooksTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$BooksTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BooksTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> isbn = const Value.absent(),
                Value<String?> title = const Value.absent(),
                Value<String?> author = const Value.absent(),
                Value<String?> author2 = const Value.absent(),
                Value<String?> author3 = const Value.absent(),
                Value<String?> author4 = const Value.absent(),
                Value<String?> author5 = const Value.absent(),
                Value<String?> publisher = const Value.absent(),
                Value<String?> year = const Value.absent(),
                Value<int> quantity = const Value.absent(),
                Value<String?> condition = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<String?> shelfLocation = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                Value<String> schoolId = const Value.absent(),
                Value<String> clerkId = const Value.absent(),
                Value<bool> flaggedAsDuplicate = const Value.absent(),
                Value<String> syncState = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => BooksCompanion(
                id: id,
                isbn: isbn,
                title: title,
                author: author,
                author2: author2,
                author3: author3,
                author4: author4,
                author5: author5,
                publisher: publisher,
                year: year,
                quantity: quantity,
                condition: condition,
                category: category,
                shelfLocation: shelfLocation,
                notes: notes,
                schoolId: schoolId,
                clerkId: clerkId,
                flaggedAsDuplicate: flaggedAsDuplicate,
                syncState: syncState,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> isbn = const Value.absent(),
                Value<String?> title = const Value.absent(),
                Value<String?> author = const Value.absent(),
                Value<String?> author2 = const Value.absent(),
                Value<String?> author3 = const Value.absent(),
                Value<String?> author4 = const Value.absent(),
                Value<String?> author5 = const Value.absent(),
                Value<String?> publisher = const Value.absent(),
                Value<String?> year = const Value.absent(),
                Value<int> quantity = const Value.absent(),
                Value<String?> condition = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<String?> shelfLocation = const Value.absent(),
                Value<String?> notes = const Value.absent(),
                required String schoolId,
                required String clerkId,
                Value<bool> flaggedAsDuplicate = const Value.absent(),
                Value<String> syncState = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => BooksCompanion.insert(
                id: id,
                isbn: isbn,
                title: title,
                author: author,
                author2: author2,
                author3: author3,
                author4: author4,
                author5: author5,
                publisher: publisher,
                year: year,
                quantity: quantity,
                condition: condition,
                category: category,
                shelfLocation: shelfLocation,
                notes: notes,
                schoolId: schoolId,
                clerkId: clerkId,
                flaggedAsDuplicate: flaggedAsDuplicate,
                syncState: syncState,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$BooksTable, Book>(table),
                  BaseReferences<_$AppDatabase, $BooksTable, Book>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$BooksTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $BooksTable,
      Book,
      $$BooksTableFilterComposer,
      $$BooksTableOrderingComposer,
      $$BooksTableAnnotationComposer,
      $$BooksTableCreateCompanionBuilder,
      $$BooksTableUpdateCompanionBuilder,
      (Book, BaseReferences<_$AppDatabase, $BooksTable, Book>),
      Book,
      PrefetchHooks Function()
    >;
typedef $$OutboxTableCreateCompanionBuilder = OutboxCompanion Function({
  Value<int> seq,
  required String entity,
  required String entityId,
  required String op,
  required String payload,
  Value<int> attempts,
  Value<String?> lastError,
  Value<DateTime> createdAt,
});
typedef $$OutboxTableUpdateCompanionBuilder = OutboxCompanion Function({
  Value<int> seq,
  Value<String> entity,
  Value<String> entityId,
  Value<String> op,
  Value<String> payload,
  Value<int> attempts,
  Value<String?> lastError,
  Value<DateTime> createdAt,
});

class $$OutboxTableFilterComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get seq => $composableBuilder(
    column: $table.seq,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entity => $composableBuilder(
    column: $table.entity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get op => $composableBuilder(
    column: $table.op,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OutboxTableOrderingComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get seq => $composableBuilder(
    column: $table.seq,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entity => $composableBuilder(
    column: $table.entity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get op => $composableBuilder(
    column: $table.op,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OutboxTableAnnotationComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get seq =>
      $composableBuilder(column: $table.seq, builder: (column) => column);

  GeneratedColumn<String> get entity =>
      $composableBuilder(column: $table.entity, builder: (column) => column);

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get op =>
      $composableBuilder(column: $table.op, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$OutboxTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OutboxTable,
          OutboxData,
          $$OutboxTableFilterComposer,
          $$OutboxTableOrderingComposer,
          $$OutboxTableAnnotationComposer,
          $$OutboxTableCreateCompanionBuilder,
          $$OutboxTableUpdateCompanionBuilder,
          (OutboxData, BaseReferences<_$AppDatabase, $OutboxTable, OutboxData>),
          OutboxData,
          PrefetchHooks Function()
        > {
  $$OutboxTableTableManager(_$AppDatabase db, $OutboxTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OutboxTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OutboxTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OutboxTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> seq = const Value.absent(),
                Value<String> entity = const Value.absent(),
                Value<String> entityId = const Value.absent(),
                Value<String> op = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => OutboxCompanion(
                seq: seq,
                entity: entity,
                entityId: entityId,
                op: op,
                payload: payload,
                attempts: attempts,
                lastError: lastError,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> seq = const Value.absent(),
                required String entity,
                required String entityId,
                required String op,
                required String payload,
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => OutboxCompanion.insert(
                seq: seq,
                entity: entity,
                entityId: entityId,
                op: op,
                payload: payload,
                attempts: attempts,
                lastError: lastError,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$OutboxTable, OutboxData>(table),
                  BaseReferences<_$AppDatabase, $OutboxTable, OutboxData>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OutboxTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OutboxTable,
      OutboxData,
      $$OutboxTableFilterComposer,
      $$OutboxTableOrderingComposer,
      $$OutboxTableAnnotationComposer,
      $$OutboxTableCreateCompanionBuilder,
      $$OutboxTableUpdateCompanionBuilder,
      (OutboxData, BaseReferences<_$AppDatabase, $OutboxTable, OutboxData>),
      OutboxData,
      PrefetchHooks Function()
    >;
typedef $$MetadataCacheTableCreateCompanionBuilder =
    MetadataCacheCompanion Function({
      required String isbn,
      Value<String?> title,
      Value<String?> author,
      Value<String?> author2,
      Value<String?> author3,
      Value<String?> author4,
      Value<String?> author5,
      Value<String?> publisher,
      Value<String?> year,
      Value<String?> category,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });
typedef $$MetadataCacheTableUpdateCompanionBuilder =
    MetadataCacheCompanion Function({
      Value<String> isbn,
      Value<String?> title,
      Value<String?> author,
      Value<String?> author2,
      Value<String?> author3,
      Value<String?> author4,
      Value<String?> author5,
      Value<String?> publisher,
      Value<String?> year,
      Value<String?> category,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

class $$MetadataCacheTableFilterComposer
    extends Composer<_$AppDatabase, $MetadataCacheTable> {
  $$MetadataCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get isbn => $composableBuilder(
    column: $table.isbn,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author => $composableBuilder(
    column: $table.author,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author2 => $composableBuilder(
    column: $table.author2,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author3 => $composableBuilder(
    column: $table.author3,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author4 => $composableBuilder(
    column: $table.author4,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get author5 => $composableBuilder(
    column: $table.author5,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get publisher => $composableBuilder(
    column: $table.publisher,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get year => $composableBuilder(
    column: $table.year,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$MetadataCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $MetadataCacheTable> {
  $$MetadataCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get isbn => $composableBuilder(
    column: $table.isbn,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author => $composableBuilder(
    column: $table.author,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author2 => $composableBuilder(
    column: $table.author2,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author3 => $composableBuilder(
    column: $table.author3,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author4 => $composableBuilder(
    column: $table.author4,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get author5 => $composableBuilder(
    column: $table.author5,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get publisher => $composableBuilder(
    column: $table.publisher,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get year => $composableBuilder(
    column: $table.year,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$MetadataCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $MetadataCacheTable> {
  $$MetadataCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get isbn =>
      $composableBuilder(column: $table.isbn, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get author =>
      $composableBuilder(column: $table.author, builder: (column) => column);

  GeneratedColumn<String> get author2 =>
      $composableBuilder(column: $table.author2, builder: (column) => column);

  GeneratedColumn<String> get author3 =>
      $composableBuilder(column: $table.author3, builder: (column) => column);

  GeneratedColumn<String> get author4 =>
      $composableBuilder(column: $table.author4, builder: (column) => column);

  GeneratedColumn<String> get author5 =>
      $composableBuilder(column: $table.author5, builder: (column) => column);

  GeneratedColumn<String> get publisher =>
      $composableBuilder(column: $table.publisher, builder: (column) => column);

  GeneratedColumn<String> get year =>
      $composableBuilder(column: $table.year, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$MetadataCacheTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MetadataCacheTable,
          MetadataCacheData,
          $$MetadataCacheTableFilterComposer,
          $$MetadataCacheTableOrderingComposer,
          $$MetadataCacheTableAnnotationComposer,
          $$MetadataCacheTableCreateCompanionBuilder,
          $$MetadataCacheTableUpdateCompanionBuilder,
          (
            MetadataCacheData,
            BaseReferences<
              _$AppDatabase,
              $MetadataCacheTable,
              MetadataCacheData
            >,
          ),
          MetadataCacheData,
          PrefetchHooks Function()
        > {
  $$MetadataCacheTableTableManager(_$AppDatabase db, $MetadataCacheTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MetadataCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MetadataCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MetadataCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> isbn = const Value.absent(),
                Value<String?> title = const Value.absent(),
                Value<String?> author = const Value.absent(),
                Value<String?> author2 = const Value.absent(),
                Value<String?> author3 = const Value.absent(),
                Value<String?> author4 = const Value.absent(),
                Value<String?> author5 = const Value.absent(),
                Value<String?> publisher = const Value.absent(),
                Value<String?> year = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MetadataCacheCompanion(
                isbn: isbn,
                title: title,
                author: author,
                author2: author2,
                author3: author3,
                author4: author4,
                author5: author5,
                publisher: publisher,
                year: year,
                category: category,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String isbn,
                Value<String?> title = const Value.absent(),
                Value<String?> author = const Value.absent(),
                Value<String?> author2 = const Value.absent(),
                Value<String?> author3 = const Value.absent(),
                Value<String?> author4 = const Value.absent(),
                Value<String?> author5 = const Value.absent(),
                Value<String?> publisher = const Value.absent(),
                Value<String?> year = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MetadataCacheCompanion.insert(
                isbn: isbn,
                title: title,
                author: author,
                author2: author2,
                author3: author3,
                author4: author4,
                author5: author5,
                publisher: publisher,
                year: year,
                category: category,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$MetadataCacheTable, MetadataCacheData>(table),
                  BaseReferences<
                    _$AppDatabase,
                    $MetadataCacheTable,
                    MetadataCacheData
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$MetadataCacheTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MetadataCacheTable,
      MetadataCacheData,
      $$MetadataCacheTableFilterComposer,
      $$MetadataCacheTableOrderingComposer,
      $$MetadataCacheTableAnnotationComposer,
      $$MetadataCacheTableCreateCompanionBuilder,
      $$MetadataCacheTableUpdateCompanionBuilder,
      (
        MetadataCacheData,
        BaseReferences<_$AppDatabase, $MetadataCacheTable, MetadataCacheData>,
      ),
      MetadataCacheData,
      PrefetchHooks Function()
    >;
typedef $$SchoolsTableTableCreateCompanionBuilder =
    SchoolsTableCompanion Function({
      required String id,
      required String name,
      Value<String?> district,
      Value<String?> region,
      Value<bool> active,
      Value<int> rowid,
    });
typedef $$SchoolsTableTableUpdateCompanionBuilder =
    SchoolsTableCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<String?> district,
      Value<String?> region,
      Value<bool> active,
      Value<int> rowid,
    });

class $$SchoolsTableTableFilterComposer
    extends Composer<_$AppDatabase, $SchoolsTableTable> {
  $$SchoolsTableTableFilterComposer({
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

  ColumnFilters<String> get district => $composableBuilder(
    column: $table.district,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get region => $composableBuilder(
    column: $table.region,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get active => $composableBuilder(
    column: $table.active,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SchoolsTableTableOrderingComposer
    extends Composer<_$AppDatabase, $SchoolsTableTable> {
  $$SchoolsTableTableOrderingComposer({
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

  ColumnOrderings<String> get district => $composableBuilder(
    column: $table.district,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get region => $composableBuilder(
    column: $table.region,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get active => $composableBuilder(
    column: $table.active,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SchoolsTableTableAnnotationComposer
    extends Composer<_$AppDatabase, $SchoolsTableTable> {
  $$SchoolsTableTableAnnotationComposer({
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

  GeneratedColumn<String> get district =>
      $composableBuilder(column: $table.district, builder: (column) => column);

  GeneratedColumn<String> get region =>
      $composableBuilder(column: $table.region, builder: (column) => column);

  GeneratedColumn<bool> get active =>
      $composableBuilder(column: $table.active, builder: (column) => column);
}

class $$SchoolsTableTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SchoolsTableTable,
          SchoolsTableData,
          $$SchoolsTableTableFilterComposer,
          $$SchoolsTableTableOrderingComposer,
          $$SchoolsTableTableAnnotationComposer,
          $$SchoolsTableTableCreateCompanionBuilder,
          $$SchoolsTableTableUpdateCompanionBuilder,
          (
            SchoolsTableData,
            BaseReferences<_$AppDatabase, $SchoolsTableTable, SchoolsTableData>,
          ),
          SchoolsTableData,
          PrefetchHooks Function()
        > {
  $$SchoolsTableTableTableManager(_$AppDatabase db, $SchoolsTableTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SchoolsTableTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SchoolsTableTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SchoolsTableTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> district = const Value.absent(),
                Value<String?> region = const Value.absent(),
                Value<bool> active = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SchoolsTableCompanion(
                id: id,
                name: name,
                district: district,
                region: region,
                active: active,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<String?> district = const Value.absent(),
                Value<String?> region = const Value.absent(),
                Value<bool> active = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SchoolsTableCompanion.insert(
                id: id,
                name: name,
                district: district,
                region: region,
                active: active,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$SchoolsTableTable, SchoolsTableData>(table),
                  BaseReferences<
                    _$AppDatabase,
                    $SchoolsTableTable,
                    SchoolsTableData
                  >(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SchoolsTableTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SchoolsTableTable,
      SchoolsTableData,
      $$SchoolsTableTableFilterComposer,
      $$SchoolsTableTableOrderingComposer,
      $$SchoolsTableTableAnnotationComposer,
      $$SchoolsTableTableCreateCompanionBuilder,
      $$SchoolsTableTableUpdateCompanionBuilder,
      (
        SchoolsTableData,
        BaseReferences<_$AppDatabase, $SchoolsTableTable, SchoolsTableData>,
      ),
      SchoolsTableData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$BooksTableTableManager get books =>
      $$BooksTableTableManager(_db, _db.books);
  $$OutboxTableTableManager get outbox =>
      $$OutboxTableTableManager(_db, _db.outbox);
  $$MetadataCacheTableTableManager get metadataCache =>
      $$MetadataCacheTableTableManager(_db, _db.metadataCache);
  $$SchoolsTableTableTableManager get schoolsTable =>
      $$SchoolsTableTableTableManager(_db, _db.schoolsTable);
}
