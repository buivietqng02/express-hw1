const path = require('path');
const assert = require('assert');
const kill = require('kill-port');
const faker = require('faker');
const { parseOpenAPIdoc, prepareRequests } = require('../../utils');
const { Test } = require('../../models/test')

module.exports = async () => {
  const openApiPath = path.resolve(__dirname, 'openapi.yaml');
  const doc = await parseOpenAPIdoc(openApiPath);
  const operations = prepareRequests(doc);

  const validate = async (app) => {
    await kill(8080, 'tcp');

    const name = app.getName();
    const projectId = app.getProjectId();

    try {
      await app.fetchRepo();
      await app.validateMainFiles();
      await app.installDependencies();
      await app.start();

      const username = faker.name.firstName();
      const filename = 'notes.txt';
      const content = 'testcontent';
      const token = '';

      const test = new Test(operations, '127.0.0.1', '8080');
      await test
          .call('createFile', {filename, content});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');
      }, 20);

      await test
          .call('getFiles');
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.notStrictEqual(response.body.files, undefined, 'Files property is required in response');
        assert.notStrictEqual(response.body.files, null, 'Files property is required in response');

        const [file] = response.body.files;
        assert.notStrictEqual(file, undefined, 'Files array should contain at least one file');
        assert.notStrictEqual(file, null, 'Files array should contain at least one file');
        assert.strictEqual(file, filename, 'Files array item should equal name of created file');
      }, 10);

      await test
          .call('getFile', {}, {}, {filename});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.notStrictEqual(response.body.filename, undefined, 'filename property is required in response');
        assert.notStrictEqual(response.body.filename, null, 'filename property is required in response');

        assert.notStrictEqual(response.body.content, undefined, 'content property is required in response');
        assert.notStrictEqual(response.body.content, null, 'content property is required in response');

        assert.notStrictEqual(response.body.extension, undefined, 'extension property is required in response');
        assert.notStrictEqual(response.body.extension, null, 'extension property is required in response');

        assert.notStrictEqual(response.body.uploadedDate, undefined, 'uploadedDate property is required in response');
        assert.notStrictEqual(response.body.uploadedDate, null, 'uploadedDate property is required in response');

        assert.strictEqual(response.body.filename, filename, 'filename should equal name of the created file');
        assert.strictEqual(response.body.content, content, 'content should equal content of created file');
        assert.strictEqual(response.body.extension, 'txt', 'extension should equal extension of created file #2');
      }, 10);

      // FILE #2
      const filename2 = 'data.test.json';
      const content2 = '{"message": "jsondata"}';

      await test
          .call('createFile', {filename: filename2, content: content2});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');
      }, 10);

      await test
          .call('getFiles');
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.notStrictEqual(response.body.files, undefined, 'Files property is required in response');
        assert.notStrictEqual(response.body.files, null, 'Files property is required in response');

        const [file1, file2] = response.body.files;
        assert.notStrictEqual(file1, undefined, 'Files array should contain at least two files');
        assert.notStrictEqual(file1, null, 'Files array should contain at least two files');
        assert.notStrictEqual(file2, undefined, 'Files array should contain at least two files');
        assert.notStrictEqual(file2, null, 'Files array should contain at least two files');

        assert.strictEqual(true, response.body.files.includes(filename), 'Files array item should contain name of the first file');
        assert.strictEqual(true, response.body.files.includes(filename2), 'Files array item should contain name of the second file');

        assert.strictEqual(true, response.body.files.length == 2, 'Files array should contain 2 files');
      }, 10);

      await test
          .call('getFile', {}, {}, {filename: filename2});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.notStrictEqual(response.body.filename, undefined, 'filename property is required in response');
        assert.notStrictEqual(response.body.filename, null, 'filename property is required in response');

        assert.notStrictEqual(response.body.content, undefined, 'content property is required in response');
        assert.notStrictEqual(response.body.content, null, 'content property is required in response');

        assert.notStrictEqual(response.body.extension, undefined, 'extension property is required in response');
        assert.notStrictEqual(response.body.extension, null, 'extension property is required in response');

        assert.notStrictEqual(response.body.uploadedDate, undefined, 'uploadedDate property is required in response');
        assert.notStrictEqual(response.body.uploadedDate, null, 'uploadedDate property is required in response');

        assert.strictEqual(response.body.filename, filename2, 'filename should equal name of the created file #2');
        assert.strictEqual(response.body.content, content2, 'content should equal content of created file #2');
        assert.strictEqual(response.body.extension, 'json', 'extension should equal extension of created file #2');
      }, 10);

      // get file by wrong filename

      await test
          .call('getFile', {}, {}, {filename: 'filename2'});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.strictEqual(!!response.body.filename, false, 'filename property should not be defined in response(wrong file)');
        assert.strictEqual(!!response.body.content, false, 'content property should not be defined in response(wrong file)');

        assert.strictEqual(response.statusCode, 400, 'Status code should equal 400');
      }, 10, false);

      // try to create file without filename

      await test
          .call('createFile', {content: content2});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.strictEqual(response.statusCode, 400, 'Status code should equal 400');
      }, 10, false);

      // try to create file without content

      await test
          .call('createFile', {filename: content2});
      test.validateResponseBody((response) => {
        assert.notStrictEqual(response.body.message, undefined, 'Message property is required in response');
        assert.notStrictEqual(response.body.message, null, 'Message property is required in response');

        assert.strictEqual(response.statusCode, 400, 'Status code should equal 400');
      }, 10, false);

      const rating = test.getRating();
      const errors = test.getErrors();

      await app.stop();

      console.log({
        name,
        projectId,
        rating,
        errors,
      });

      return {
        name,
        projectId,
        rating,
        errors,
      };
    } catch (err) {
      console.log(err);
      return {
        name,
        projectId,
        rating: 0,
        errors: [err.message],
      };
    }
  };

  return {
    doc,
    operations,
    validate,
  };
};
